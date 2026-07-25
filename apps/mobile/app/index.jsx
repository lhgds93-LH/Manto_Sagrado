import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const categories = ["Todos", "Brasileirão", "Internacionais", "Seleções", "Retrô", "Kids"];

const products = [
  { id: "MS-001", name: "Camisa Aurora 2026", category: "Brasileirão", price: 149.9, tone: "#3b3019" },
  { id: "MS-002", name: "Camisa Imperial Away", category: "Internacionais", price: 159.9, tone: "#555" },
  { id: "MS-003", name: "Seleção Clássica", category: "Seleções", price: 139.9, tone: "#1f5b3e" },
  { id: "MS-004", name: "Camisa Eclipse Player", category: "Internacionais", price: 179.9, tone: "#173e6d" },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [favorites, setFavorites] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const categoryMatches = activeCategory === "Todos" || product.category === activeCategory;
      const searchMatches =
        !normalizedQuery ||
        `${product.name} ${product.category}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      return categoryMatches && searchMatches;
    });
  }, [activeCategory, query]);

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>MS</Text>
              </View>
              <View>
                <Text style={styles.brand}>MANTO SAGRADO</Text>
                <Text style={styles.tagline}>Futebol é paixão</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.cartButton} accessibilityLabel={`Carrinho com ${cartCount} itens`}>
              <Text style={styles.cartIcon}>▣</Text>
              {cartCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>COLEÇÃO 2026</Text>
              <Text style={styles.heroTitle}>SEU TIME.{"\n"}SEU MANTO.</Text>
              <Text style={styles.heroDescription}>
                Camisas selecionadas, personalização e acompanhamento do pedido.
              </Text>
              <TouchableOpacity style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Ver lançamentos  →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heroShirt}>
              <Text style={styles.heroNumber}>10</Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Busque por times, seleções ou produtos"
              placeholderTextColor="#777"
              value={query}
              onChangeText={setQuery}
              accessibilityLabel="Buscar produtos"
            />
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>EXPLORE</Text>
              <Text style={styles.sectionTitle}>Categorias</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.category, active && styles.categoryActive]}
                  onPress={() => setActiveCategory(category)}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionKicker}>ESCOLHIDOS PARA VOCÊ</Text>
              <Text style={styles.sectionTitle}>{query ? "Resultados" : "Lançamentos"}</Text>
            </View>
            <Text style={styles.resultCount}>{visibleProducts.length} itens</Text>
          </View>

          <View style={styles.grid}>
            {visibleProducts.map((product) => {
              const favorite = favorites.includes(product.id);
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={[styles.productImage, { backgroundColor: product.tone }]}>
                    <Text style={styles.productBadge}>LANÇAMENTO</Text>
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(product.id)}
                      accessibilityLabel={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Text style={[styles.favoriteText, favorite && styles.favoriteTextActive]}>
                        {favorite ? "♥" : "♡"}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.miniShirt}>
                      <Text style={styles.miniShirtNumber}>{product.id.slice(-2)}</Text>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>{money.format(product.price)}</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setCartCount((count) => count + 1)}>
                      <Text style={styles.addButtonText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {visibleProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⌕</Text>
              <Text style={styles.emptyTitle}>Nenhum manto encontrado</Text>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setQuery("");
                  setActiveCategory("Todos");
                }}
              >
                <Text style={styles.resetButtonText}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.bottomNav}>
          {[
            ["⌂", "Início", true],
            ["▦", "Categorias", false],
            ["♡", "Favoritos", false],
            ["▤", "Pedidos", false],
            ["○", "Perfil", false],
          ].map(([icon, label, active]) => (
            <TouchableOpacity key={label} style={[styles.navItem, active && styles.navItemActive]}>
              <Text style={[styles.navIcon, active && styles.navTextActive]}>{icon}</Text>
              <Text style={[styles.navLabel, active && styles.navTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#090909" },
  screen: { flex: 1, backgroundColor: "#090909" },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoPlaceholder: { width: 42, height: 48, borderWidth: 1, borderColor: "#d4af37", borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#17130d" },
  logoText: { color: "#f0cd67", fontWeight: "900", fontSize: 12 },
  brand: { color: "#f5f5f5", fontWeight: "900", letterSpacing: 1 },
  tagline: { color: "#888", fontSize: 11, marginTop: 2 },
  cartButton: { width: 44, height: 44, borderWidth: 1, borderColor: "#282828", borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#111" },
  cartIcon: { color: "#f5f5f5", fontSize: 18 },
  cartBadge: { position: "absolute", top: -5, right: -5, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#d4af37", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#090909" },
  cartBadgeText: { color: "#090909", fontSize: 10, fontWeight: "900" },
  hero: { minHeight: 270, borderRadius: 24, padding: 22, overflow: "hidden", backgroundColor: "#151515", borderWidth: 1, borderColor: "#272219", flexDirection: "row" },
  heroCopy: { flex: 1, zIndex: 2 },
  eyebrow: { color: "#f0cd67", fontWeight: "900", fontSize: 10, letterSpacing: 2 },
  heroTitle: { color: "#f5f5f5", fontWeight: "900", fontSize: 38, lineHeight: 34, letterSpacing: -2, marginTop: 12 },
  heroDescription: { color: "#aaa", fontSize: 13, lineHeight: 19, marginTop: 13, width: "90%" },
  heroButton: { alignSelf: "flex-start", minHeight: 42, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#d4af37", justifyContent: "center", marginTop: 18 },
  heroButtonText: { color: "#090909", fontWeight: "900", fontSize: 12 },
  heroShirt: { position: "absolute", right: -30, bottom: -12, width: 150, height: 210, backgroundColor: "#2b2416", borderRadius: 40, transform: [{ rotate: "7deg" }], alignItems: "center", justifyContent: "center", opacity: 0.84 },
  heroNumber: { color: "#d4af37", fontSize: 62, fontWeight: "900", opacity: 0.72 },
  searchBox: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, borderRadius: 17, borderWidth: 1, borderColor: "#3a321d", backgroundColor: "#111", marginTop: 14 },
  searchIcon: { color: "#f0cd67", fontSize: 22 },
  searchInput: { flex: 1, color: "#f5f5f5", fontSize: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 32, marginBottom: 15 },
  sectionKicker: { color: "#f0cd67", fontSize: 9, fontWeight: "900", letterSpacing: 1.7 },
  sectionTitle: { color: "#f5f5f5", fontSize: 25, fontWeight: "900", letterSpacing: -1, marginTop: 3 },
  resultCount: { color: "#888", fontSize: 11 },
  categories: { gap: 9, paddingRight: 16 },
  category: { minHeight: 42, paddingHorizontal: 15, borderRadius: 13, borderWidth: 1, borderColor: "#272727", backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  categoryActive: { borderColor: "#d4af37", backgroundColor: "#211c10" },
  categoryText: { color: "#aaa", fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: "#f0cd67" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  productCard: { width: "48.5%", overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: "#252525", backgroundColor: "#111" },
  productImage: { height: 190, alignItems: "center", justifyContent: "center" },
  productBadge: { position: "absolute", top: 9, left: 9, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: "rgba(9,9,9,0.78)", color: "#f0cd67", fontSize: 7, fontWeight: "900" },
  favoriteButton: { position: "absolute", top: 7, right: 7, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(9,9,9,0.75)", alignItems: "center", justifyContent: "center" },
  favoriteText: { color: "#f5f5f5", fontSize: 18 },
  favoriteTextActive: { color: "#f0cd67" },
  miniShirt: { width: 100, height: 130, borderRadius: 28, backgroundColor: "rgba(9,9,9,0.7)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-3deg" }] },
  miniShirtNumber: { color: "rgba(255,255,255,0.62)", fontSize: 34, fontWeight: "900" },
  productInfo: { padding: 12 },
  productCategory: { color: "#f0cd67", fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  productName: { color: "#f5f5f5", fontWeight: "800", fontSize: 13, lineHeight: 18, minHeight: 36, marginTop: 5 },
  productPrice: { color: "#f5f5f5", fontWeight: "900", fontSize: 16, marginTop: 8 },
  addButton: { minHeight: 39, borderRadius: 12, borderWidth: 1, borderColor: "#5f4f20", backgroundColor: "#211c10", alignItems: "center", justifyContent: "center", marginTop: 10 },
  addButtonText: { color: "#f0cd67", fontWeight: "900", fontSize: 11 },
  emptyState: { minHeight: 250, borderWidth: 1, borderColor: "#3a321d", borderStyle: "dashed", borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 5 },
  emptyIcon: { color: "#f0cd67", fontSize: 42 },
  emptyTitle: { color: "#f5f5f5", fontWeight: "900", marginTop: 10 },
  resetButton: { marginTop: 16, minHeight: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#222", justifyContent: "center" },
  resetButtonText: { color: "#f5f5f5", fontWeight: "800" },
  bottomSpacer: { height: 100 },
  bottomNav: { position: "absolute", left: 10, right: 10, bottom: 10, minHeight: 68, borderRadius: 20, padding: 6, flexDirection: "row", borderWidth: 1, borderColor: "#292929", backgroundColor: "rgba(17,17,17,0.98)" },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 14, gap: 3 },
  navItemActive: { backgroundColor: "#211c10" },
  navIcon: { color: "#777", fontSize: 16 },
  navLabel: { color: "#777", fontSize: 9, fontWeight: "700" },
  navTextActive: { color: "#f0cd67" },
});
