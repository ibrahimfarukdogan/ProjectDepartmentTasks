import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

export const showToast = (
  type: ToastType,
  title: string,
  message?: string
) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 60,
  });
};

export function normalize(str: string | undefined | null): string {
  if (!str) return "";

  return str
    .toLocaleLowerCase("tr-TR") // 1️⃣ correct locale-aware lowercase
    .normalize("NFD")           // 2️⃣ decompose diacritics (including dotted İ)
    .replace(/[\u0300-\u036f]/g, "") // 3️⃣ remove all combining marks
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/â/g, "a")
    .trim();
}