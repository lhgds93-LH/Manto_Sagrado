import { Stack } from "expo-router";
import { StatusBar } from "react-native";

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#090909" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#090909" } }} />
    </>
  );
}
