import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

import { Body, Mono } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl, uploadAvatar } from "@/lib/_core/api";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  size?: number;
  /** Optional caption shown below the avatar (e.g. "Tap to add a photo"). */
  caption?: string;
};

/**
 * Circular avatar picker used during signup and profile editing.
 * Tap to pick from library → uploads to /api/uploads/avatar → stores
 * the returned relative URL via onChange.
 */
export function AvatarPicker({ value, onChange, size = 112, caption }: Props) {
  const colors = useColors();
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
        "Allow access to photos in Settings to add a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setPreviewUri(asset.uri);
    setUploading(true);
    try {
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const { url } = await uploadAvatar(asset.uri, fileName, mimeType);
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

  const hasImage = Boolean(displayUri);
  const ringStyle = hasImage
    ? { backgroundColor: colors["background-elevated"] }
    : { backgroundColor: colors.surface };

  return (
    <View className="items-center gap-2.5">
      <View style={{ width: size, height: size }} className="relative">
        {/* Soft ring backdrop — adds depth without ornament. */}
        <View
          pointerEvents="none"
          className="absolute rounded-full"
          style={{
            top: -6,
            left: -6,
            right: -6,
            bottom: -6,
            backgroundColor: colors.primary + "18",
          }}
        />
        <Pressable
          onPress={pickImage}
          disabled={uploading}
          className="rounded-full overflow-hidden items-center justify-center active:opacity-80"
          style={[
            { width: size, height: size, borderWidth: 2, borderColor: colors.foreground },
            ringStyle,
          ]}
        >
          {hasImage ? (
            <Image
              source={{ uri: displayUri ?? undefined }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="person" size={size * 0.36} color={colors.muted} />
          )}
          {uploading ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            >
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </Pressable>

        {/* Camera badge — pinned to the bottom-right of the avatar. */}
        <Pressable
          onPress={pickImage}
          disabled={uploading}
          hitSlop={6}
          className="absolute rounded-full items-center justify-center active:opacity-80"
          style={{
            right: -2,
            bottom: -2,
            width: 32,
            height: 32,
            backgroundColor: colors.foreground,
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          <Ionicons
            name={hasImage ? "create-outline" : "camera"}
            size={14}
            color={colors.background}
          />
        </Pressable>
      </View>

      {caption ? (
        <Body className="text-muted text-xs text-center">{caption}</Body>
      ) : null}
      {hasImage && !uploading ? (
        <Pressable onPress={clearImage} hitSlop={6} className="active:opacity-60">
          <Mono className="text-[10px] uppercase" style={{ color: colors.error, letterSpacing: 1.5 }}>
            REMOVE
          </Mono>
        </Pressable>
      ) : null}
      {error ? (
        <Mono className="text-[10px] uppercase" style={{ color: colors.error, letterSpacing: 1.2 }}>
          {error}
        </Mono>
      ) : null}
    </View>
  );
}
