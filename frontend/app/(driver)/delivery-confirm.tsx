import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmDelivery } from '@/src/api/orders';
import { infoAlert } from '@/src/lib/alerts';

// SignatureCanvas uses WebView internally — not supported on web
const SignatureCanvas =
  Platform.OS !== 'web'
    ? require('react-native-signature-canvas').default
    : null;

const PRIMARY = '#FF6B35';
const SECONDARY = '#2C3E50';
const BG = '#F5F5F5';

// ─── Web canvas signature pad ─────────────────────────────────────────────────

function WebSignaturePad({
  onSave,
  onClear,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const containerRef = useRef<View>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const domNode = containerRef.current as unknown as HTMLElement;
    if (!domNode) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    domNode.appendChild(canvas);
    canvasRef.current = canvas;

    // Size canvas to its CSS size
    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    });
    resizeObserver.observe(canvas);

    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let isDrawing = false;

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }

    function onStart(e: MouseEvent | TouchEvent) {
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function onStop() {
      isDrawing = false;
    }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onStop);
    canvas.addEventListener('mouseleave', onStop);
    canvas.addEventListener('touchstart', onStart);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onStop);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onStop);
      canvas.removeEventListener('mouseleave', onStop);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onStop);
      if (domNode.contains(canvas)) domNode.removeChild(canvas);
      canvasRef.current = null;
    };
  }, []);

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }

  function handleClearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }

  return (
    <View style={styles.webSigWrapper}>
      <View ref={containerRef} style={styles.webSigCanvas} />
      <View style={styles.webSigActions}>
        <TouchableOpacity style={styles.webSigClearBtn} onPress={handleClearCanvas}>
          <Text style={styles.webSigClearText}>Borrar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.webSigSaveBtn} onPress={handleSave}>
          <Text style={styles.webSigSaveText}>Guardar firma</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DeliveryConfirmScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const signatureRef = useRef<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sigPadKey, setSigPadKey] = useState(0);

  const confirmMutation = useMutation({
    mutationFn: ({
      sigDataUrl,
      imgUri,
    }: {
      sigDataUrl: string;
      imgUri: string | null;
    }) => {
      const signatureFile = {
        uri: sigDataUrl,
        name: 'signature.png',
        type: 'image/png',
      };
      const photoFile = imgUri
        ? { uri: imgUri, name: 'proof.jpg', type: 'image/jpeg' }
        : undefined;
      return confirmDelivery(orderId, signatureFile, photoFile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-active-order'] });
      qc.invalidateQueries({ queryKey: ['driver-history'] });
      infoAlert(
        '¡Entrega confirmada!',
        'La entrega fue registrada exitosamente.',
        () => router.replace('/(driver)/active-delivery' as never),
      );
    },
    onError: () => {
      infoAlert('Error', 'No se pudo confirmar la entrega. Intentá de nuevo.');
    },
  });

  async function handlePickPhoto() {
    if (Platform.OS === 'web') {
      // On web, open file picker directly (no camera/gallery choice dialog)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus.status !== 'granted') {
        infoAlert('Permiso requerido', 'Se necesita acceso a la cámara o galería para adjuntar la foto.');
        return;
      }
    }

    // Native: show choice via a simple two-button approach
    // We use ImagePicker.launchCameraAsync directly since confirmAlert only has one confirm action.
    // For simplicity on native we default to camera; user can tap the preview to switch to gallery.
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function handleClearSignature() {
    if (Platform.OS !== 'web') {
      signatureRef.current?.clearSignature();
    }
    setSignatureData(null);
    setSigPadKey((k) => k + 1);
  }

  function handleSubmit() {
    if (!signatureData) {
      infoAlert('Firma requerida', 'El destinatario debe firmar antes de confirmar la entrega.');
      return;
    }
    confirmMutation.mutate({ sigDataUrl: signatureData, imgUri: photoUri });
  }

  const isReady = !!signatureData;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={PRIMARY} />
          <Text style={styles.infoText}>
            Pedile al destinatario que firme para completar la confirmación. La foto de comprobante es opcional.
          </Text>
        </View>

        {/* Signature section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.stepBadge, signatureData ? styles.stepBadgeDone : {}]}>
                {signatureData ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={styles.stepNum}>1</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Firma del destinatario</Text>
            </View>
            {signatureData && (
              <TouchableOpacity onPress={handleClearSignature} style={styles.clearBtn}>
                <Ionicons name="refresh" size={15} color="#666" />
                <Text style={styles.clearBtnText}>Borrar</Text>
              </TouchableOpacity>
            )}
          </View>

          {Platform.OS === 'web' ? (
            <WebSignaturePad
              key={sigPadKey}
              onSave={(dataUrl) => setSignatureData(dataUrl)}
              onClear={() => setSignatureData(null)}
            />
          ) : (
            <View style={styles.signatureBox}>
              <SignatureCanvas
                key={sigPadKey}
                ref={signatureRef}
                onOK={(sig: string) => setSignatureData(sig)}
                onEmpty={() => setSignatureData(null)}
                descriptionText=""
                clearText="Borrar"
                confirmText="Guardar firma"
                webStyle={signatureWebStyle}
                backgroundColor="white"
                style={styles.signatureCanvas}
              />
            </View>
          )}

          {!signatureData && (
            <Text style={styles.signatureHint}>
              {Platform.OS === 'web'
                ? 'Dibujá la firma en el recuadro y presioná "Guardar firma"'
                : 'El destinatario debe dibujar su firma en el recuadro blanco y presionar "Guardar firma"'}
            </Text>
          )}
          {signatureData && (
            <View style={styles.signatureDone}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.signatureDoneText}>Firma guardada</Text>
            </View>
          )}
        </View>

        {/* Photo section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.stepBadge, photoUri ? styles.stepBadgeDone : {}]}>
                {photoUri ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={styles.stepNum}>2</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Foto de comprobante <Text style={styles.optionalLabel}>(opcional)</Text></Text>
            </View>
            {photoUri && (
              <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.clearBtn}>
                <Ionicons name="close" size={15} color="#666" />
                <Text style={styles.clearBtnText}>Quitar</Text>
              </TouchableOpacity>
            )}
          </View>

          {photoUri ? (
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickPhoto} activeOpacity={0.7}>
                <Ionicons name="camera" size={28} color="#CCC" />
                <Text style={styles.photoPlaceholderText}>
                  {Platform.OS === 'web' ? 'Seleccionar imagen' : 'Cámara'}
                </Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.photoPlaceholder} onPress={handlePickFromGallery} activeOpacity={0.7}>
                  <Ionicons name="images" size={28} color="#CCC" />
                  <Text style={styles.photoPlaceholderText}>Galería</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isReady || confirmMutation.isPending) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isReady || confirmMutation.isPending}
          activeOpacity={0.8}
        >
          {confirmMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.submitBtnText}>Confirmar entrega</Text>
            </>
          )}
        </TouchableOpacity>

        {!isReady && (
          <Text style={styles.submitHint}>
            Completá la firma para habilitar la confirmación
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Injected CSS for the native signature WebView
const signatureWebStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    border: none;
    height: 180px;
  }
  .m-signature-pad--footer {
    margin: 0;
    padding: 8px;
  }
  .m-signature-pad--footer .button.save {
    background-color: #FF6B35;
    color: white;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 14px;
  }
  .m-signature-pad--footer .button.clear {
    background-color: #F3F4F6;
    color: #374151;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 600;
    font-size: 14px;
  }
`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFD5C2',
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 18 },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: { backgroundColor: '#10B981' },
  stepNum: { fontSize: 13, fontWeight: '800', color: '#666' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: SECONDARY },
  optionalLabel: { fontSize: 12, fontWeight: '400', color: '#9CA3AF' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  // Native signature canvas
  signatureBox: {
    height: 260,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  signatureCanvas: { flex: 1 },
  // Web signature pad
  webSigWrapper: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  webSigCanvas: {
    height: 200,
    backgroundColor: '#FAFAFA',
    cursor: 'crosshair',
  } as any,
  webSigActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  webSigClearBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  webSigClearText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  webSigSaveBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY,
  },
  webSigSaveText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Shared
  signatureHint: { fontSize: 12, color: '#AAA', textAlign: 'center', fontStyle: 'italic' },
  signatureDone: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  signatureDoneText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoPlaceholder: {
    flex: 1,
    height: 130,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    gap: 6,
  },
  photoPlaceholderText: { fontSize: 13, color: '#AAA', fontWeight: '600' },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  submitHint: { fontSize: 12, color: '#AAA', textAlign: 'center', marginTop: -8 },
});
