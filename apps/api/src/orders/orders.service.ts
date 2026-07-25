import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

type UnknownRecord = Record<string, unknown>;

interface ParsedOrderItem {
  productId: string;
  size: string;
  quantity: number;
  personalization?: string;
}

interface ParsedOrder {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: ParsedOrderItem[];
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(rawBody: unknown): Promise<unknown> {
    const body = this.parseOrder(rawBody);
    const productIds = [...new Set(body.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "ACTIVE",
      },
      include: {
        variants: {
          where: { active: true },
        },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("Um ou mais produtos não estão disponíveis.");
    }

    const preparedItems = body.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);

      if (!product) {
        throw new BadRequestException("Produto inválido.");
      }

      const variant = product.variants.find(
        (candidate) => candidate.size.toLocaleUpperCase("pt-BR") === item.size.toLocaleUpperCase("pt-BR"),
      );

      if (!variant) {
        throw new BadRequestException(`O tamanho ${item.size} não está disponível para ${product.name}.`);
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestException(`Quantidade indisponível para ${product.name}, tamanho ${item.size}.`);
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        size: variant.size,
        quantity: item.quantity,
        unitPrice: product.price,
        personalization: item.personalization,
      };
    });

    const subtotal = this.roundMoney(
      preparedItems.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
      ),
    );
    const shippingAmount = 0;
    const discountAmount = 0;
    const total = this.roundMoney(subtotal + shippingAmount - discountAmount);
    const number = this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        number,
        customerName: body.customer.name,
        customerEmail: body.customer.email,
        customerPhone: body.customer.phone,
        shippingStreet: body.shipping.street,
        shippingNumber: body.shipping.number,
        shippingComplement: body.shipping.complement,
        shippingNeighborhood: body.shipping.neighborhood,
        shippingCity: body.shipping.city,
        shippingState: body.shipping.state,
        shippingPostalCode: body.shipping.postalCode,
        subtotal,
        shippingAmount,
        discountAmount,
        total,
        items: {
          create: preparedItems,
        },
        events: {
          create: {
            status: "AWAITING_PAYMENT",
            note: "Pedido criado e aguardando confirmação do pagamento.",
            public: true,
          },
        },
      },
      select: {
        number: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        shippingAmount: true,
        discountAmount: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            sku: true,
            size: true,
            quantity: true,
            unitPrice: true,
            personalization: true,
          },
        },
      },
    });

    return this.serializePublicOrder(order);
  }

  async track(number: string, email?: string): Promise<unknown> {
    const normalizedEmail = email?.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedEmail) {
      throw new BadRequestException("Informe o e-mail usado na compra.");
    }

    const order = await this.prisma.order.findFirst({
      where: {
        number: number.trim().toLocaleUpperCase("pt-BR"),
        customerEmail: normalizedEmail,
      },
      select: {
        number: true,
        status: true,
        paymentStatus: true,
        total: true,
        trackingCode: true,
        trackingCarrier: true,
        shippedAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            productName: true,
            size: true,
            quantity: true,
            personalization: true,
          },
        },
        events: {
          where: { public: true },
          select: {
            status: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido não encontrado com os dados informados.");
    }

    return {
      ...order,
      total: Number(order.total),
    };
  }

  async listAdmin(): Promise<unknown[]> {
    const orders = await this.prisma.order.findMany({
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }));
  }

  async getOperationalTemplate(number: string): Promise<{ number: string; template: string }> {
    const order = await this.findAdminOrder(number);
    return {
      number: order.number,
      template: order.operationalMessage ?? this.buildOperationalMessage(order),
    };
  }

  async markPaid(number: string): Promise<unknown> {
    const order = await this.findAdminOrder(number);

    if (order.status === "CANCELED") {
      throw new BadRequestException("Um pedido cancelado não pode ser aprovado.");
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "APPROVED",
        status: "PAID",
        events: {
          create: {
            status: "PAID",
            note: "Pagamento confirmado.",
            public: true,
          },
        },
      },
      include: { items: true, events: true },
    });

    return this.serializeAdminOrder(updated);
  }

  async markSentToPartner(number: string): Promise<unknown> {
    const order = await this.findAdminOrder(number);

    if (order.paymentStatus !== "APPROVED") {
      throw new BadRequestException("Confirme o pagamento antes de enviar a solicitação.");
    }

    const operationalMessage = this.buildOperationalMessage(order);
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "SENT_TO_PARTNER",
        operationalMessage,
        sentToPartnerAt: new Date(),
        events: {
          create: {
            status: "SENT_TO_PARTNER",
            note: "Pedido encaminhado para preparação.",
            public: true,
          },
        },
      },
      include: { items: true, events: true },
    });

    return this.serializeAdminOrder(updated);
  }

  async registerTracking(
    number: string,
    rawTrackingCode: unknown,
    rawCarrier?: unknown,
  ): Promise<unknown> {
    const order = await this.findAdminOrder(number);
    const trackingCode = this.cleanTrackingCode(rawTrackingCode);
    const carrier =
      typeof rawCarrier === "string" && rawCarrier.trim()
        ? rawCarrier.trim().slice(0, 60)
        : "Transportadora";

    if (!order.sentToPartnerAt) {
      throw new BadRequestException("Marque a solicitação como enviada antes de cadastrar o rastreio.");
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "TRACKING_RECEIVED",
        trackingCode,
        trackingCarrier: carrier,
        trackingReceivedAt: new Date(),
        events: {
          create: {
            status: "TRACKING_RECEIVED",
            note: `Código de rastreio disponibilizado: ${trackingCode}.`,
            public: true,
          },
        },
      },
      include: { items: true, events: true },
    });

    return this.serializeAdminOrder(updated);
  }

  private async findAdminOrder(number: string) {
    const order = await this.prisma.order.findUnique({
      where: { number: number.trim().toLocaleUpperCase("pt-BR") },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      throw new NotFoundException("Pedido não encontrado.");
    }

    return order;
  }

  private buildOperationalMessage(order: Awaited<ReturnType<OrdersService["findAdminOrder"]>>): string {
    const items = order.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.productName} | SKU ${item.sku} | Tam. ${item.size} | Qtd. ${item.quantity} | Personalização: ${item.personalization ?? "Não"}`,
      )
      .join("\n");

    return [
      "NOVO PEDIDO — MANTO SAGRADO",
      `Referência interna: ${order.number}`,
      "",
      "ITENS",
      items,
      "",
      "DESTINATÁRIO",
      `Nome: ${order.customerName}`,
      `Telefone: ${order.customerPhone}`,
      `Endereço: ${order.shippingStreet}, ${order.shippingNumber}${order.shippingComplement ? `, ${order.shippingComplement}` : ""}`,
      `Bairro: ${order.shippingNeighborhood}`,
      `Cidade/UF: ${order.shippingCity}/${order.shippingState}`,
      `CEP: ${order.shippingPostalCode}`,
      "",
      "Solicito confirmação do recebimento e o código de rastreio quando disponível.",
    ].join("\n");
  }

  private parseOrder(rawBody: unknown): ParsedOrder {
    if (!this.isRecord(rawBody)) {
      throw new BadRequestException("Corpo do pedido inválido.");
    }

    const customer = this.requireRecord(rawBody.customer, "customer");
    const shipping = this.requireRecord(rawBody.shipping, "shipping");

    if (!Array.isArray(rawBody.items) || rawBody.items.length === 0 || rawBody.items.length > 20) {
      throw new BadRequestException("O pedido deve possuir entre 1 e 20 itens.");
    }

    const email = this.requireString(customer, "email", 160).toLocaleLowerCase("pt-BR");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestException("E-mail inválido.");
    }

    const phone = this.requireString(customer, "phone", 30).replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 13) {
      throw new BadRequestException("Telefone inválido.");
    }

    const state = this.requireString(shipping, "state", 2).toLocaleUpperCase("pt-BR");
    if (!/^[A-Z]{2}$/.test(state)) {
      throw new BadRequestException("UF inválida.");
    }

    const postalCode = this.requireString(shipping, "postalCode", 12).replace(/\D/g, "");
    if (postalCode.length !== 8) {
      throw new BadRequestException("CEP inválido.");
    }

    const items = rawBody.items.map((rawItem, index) => {
      const item = this.requireRecord(rawItem, `items[${index}]`);
      const quantity = item.quantity;

      if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 10) {
        throw new BadRequestException(`Quantidade inválida no item ${index + 1}.`);
      }

      const personalization =
        typeof item.personalization === "string" && item.personalization.trim()
          ? item.personalization.trim().slice(0, 30)
          : undefined;

      return {
        productId: this.requireString(item, "productId", 80),
        size: this.requireString(item, "size", 10).toLocaleUpperCase("pt-BR"),
        quantity: Number(quantity),
        personalization,
      };
    });

    return {
      customer: {
        name: this.requireString(customer, "name", 120),
        email,
        phone,
      },
      shipping: {
        street: this.requireString(shipping, "street", 160),
        number: this.requireString(shipping, "number", 20),
        complement:
          typeof shipping.complement === "string" && shipping.complement.trim()
            ? shipping.complement.trim().slice(0, 100)
            : undefined,
        neighborhood: this.requireString(shipping, "neighborhood", 100),
        city: this.requireString(shipping, "city", 100),
        state,
        postalCode,
      },
      items,
    };
  }

  private serializePublicOrder(order: {
    subtotal: unknown;
    shippingAmount: unknown;
    discountAmount: unknown;
    total: unknown;
    items: Array<{ unitPrice: unknown; [key: string]: unknown }>;
    [key: string]: unknown;
  }): Record<string, unknown> {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
      items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
    };
  }

  private serializeAdminOrder(order: {
    subtotal: unknown;
    shippingAmount: unknown;
    discountAmount: unknown;
    total: unknown;
    items: Array<{ unitPrice: unknown; [key: string]: unknown }>;
    [key: string]: unknown;
  }): Record<string, unknown> {
    return this.serializePublicOrder(order);
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const stamp = [
      date.getFullYear().toString().slice(-2),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("");
    const suffix = randomBytes(3).toString("hex").toLocaleUpperCase("pt-BR");
    return `MS-${stamp}-${suffix}`;
  }

  private cleanTrackingCode(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Código de rastreio inválido.");
    }

    const code = value.trim().toLocaleUpperCase("pt-BR");
    if (!/^[A-Z0-9-]{5,40}$/.test(code)) {
      throw new BadRequestException("Código de rastreio inválido.");
    }

    return code;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private requireRecord(value: unknown, field: string): UnknownRecord {
    if (!this.isRecord(value)) {
      throw new BadRequestException(`Campo ${field} inválido.`);
    }
    return value;
  }

  private requireString(record: UnknownRecord, field: string, maxLength: number): string {
    const value = record[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException(`Campo ${field} é obrigatório.`);
    }
    return value.trim().slice(0, maxLength);
  }

  private isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
