import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";

import { resolveImageUrl, uploadProductImage } from "@/lib/_core/api";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

export function ProductImagePicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayUri = previewUri ?? resolveImageUrl(value);

  async function pickImage() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo permission needed",
        "Allow access to photos in Settings to add product images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setPreviewUri(asset.uri);
    setUploading(true);
    try {
      const fileName = asset.fileName ?? `product-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const { url } = await uploadProductImage(asset.uri, fileName, mimeType);
      onChange(url);
      setPreviewUri(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setPreviewUri(null);
    setError(null);
    onChange(null);
  }

  return (
    <View className="gap-2">
      <Text className="text-sm text-muted">Image</Text>
      <TouchableOpacity
        className="bg-surface border border-border border-dashed rounded-xl h-40 items-center justify-center overflow-hidden"
        onPress={pickImage}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <Text className="text-muted">Tap to add product image</Text>
        )}

        {uploading ? (
          <View className="absolute inset-0 items-center justify-center bg-black/40">
            <ActivityIndicator color="white" />
          </View>
        ) : null}
      </TouchableOpacity>
      {value && !uploading ? (
        <TouchableOpacity onPress={clearImage} className="self-start px-2 py-1 active:opacity-60">
          <Text className="text-error text-sm">Remove image</Text>
        </TouchableOpacity>
      ) : null}
      {error ? <Text className="text-error text-sm">{error}</Text> : null}
    </View>
  );
}
