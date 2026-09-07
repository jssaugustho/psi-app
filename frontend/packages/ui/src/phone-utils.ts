export interface CountryConfig {
  code: string;       // Código ISO-2 (ex: 'BR')
  name: string;       // Nome em Português
  dialCode: string;   // DDI (ex: '+55')
  flag: string;       // Emoji da bandeira
  mask: string;       // Máscara gráfica (9 = dígito)
  placeholder: string; // Exemplo legível
  minDigits: number;  // Dígitos mínimos locais
  maxDigits: number;  // Dígitos máximos locais
}

// Lista centralizada e extensível de países
export const COUNTRY_LIST: CountryConfig[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', mask: '(99) 99999-9999', placeholder: '(11) 99999-9999', minDigits: 10, maxDigits: 11 },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', mask: '999 999 999', placeholder: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', mask: '(999) 999-9999', placeholder: '(201) 555-0123', minDigits: 10, maxDigits: 10 },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦', mask: '(999) 999-9999', placeholder: '(416) 555-0123', minDigits: 10, maxDigits: 10 },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸', mask: '999 999 999', placeholder: '612 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧', mask: '9999 999999', placeholder: '7700 900077', minDigits: 10, maxDigits: 11 },
  { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷', mask: '9 99 99 99 99', placeholder: '6 12 34 56 78', minDigits: 9, maxDigits: 9 },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪', mask: '9999 9999999', placeholder: '171 1234567', minDigits: 10, maxDigits: 11 },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹', mask: '999 999 9999', placeholder: '312 345 6789', minDigits: 9, maxDigits: 10 },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', mask: '9 99 9999-9999', placeholder: '9 11 1234-5678', minDigits: 10, maxDigits: 11 },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', mask: '9 9999 9999', placeholder: '9 1234 5678', minDigits: 9, maxDigits: 9 },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴', mask: '999 999 9999', placeholder: '300 123 4567', minDigits: 10, maxDigits: 10 },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', mask: '99 9999 9999', placeholder: '55 1234 5678', minDigits: 10, maxDigits: 10 },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾', mask: '99 999 999', placeholder: '99 123 456', minDigits: 8, maxDigits: 8 },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾', mask: '999 999 999', placeholder: '981 123 456', minDigits: 9, maxDigits: 9 },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', mask: '999 999 999', placeholder: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨', mask: '99 999 9999', placeholder: '99 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', mask: '999-9999999', placeholder: '412-1234567', minDigits: 10, maxDigits: 10 },
  { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴', mask: '9999 9999', placeholder: '7123 4567', minDigits: 8, maxDigits: 8 },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴', mask: '999 999 999', placeholder: '912 345 678', minDigits: 9, maxDigits: 9 },
  { code: 'MZ', name: 'Moçambique', dialCode: '+258', flag: '🇲🇿', mask: '99 999 9999', placeholder: '84 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'CH', name: 'Suíça', dialCode: '+41', flag: '🇨🇭', mask: '99 999 99 99', placeholder: '79 123 45 67', minDigits: 9, maxDigits: 9 },
  { code: 'BE', name: 'Bélgica', dialCode: '+32', flag: '🇧🇪', mask: '999 99 99 99', placeholder: '470 12 34 56', minDigits: 9, maxDigits: 9 },
  { code: 'NL', name: 'Holanda', dialCode: '+31', flag: '🇳🇱', mask: '9 99999999', placeholder: '6 12345678', minDigits: 9, maxDigits: 9 },
  { code: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪', mask: '99 999 9999', placeholder: '87 123 4567', minDigits: 9, maxDigits: 9 },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺', mask: '9999 999 999', placeholder: '0412 345 678', minDigits: 9, maxDigits: 10 },
  { code: 'NZ', name: 'Nova Zelândia', dialCode: '+64', flag: '🇳🇿', mask: '99 999 9999', placeholder: '21 123 4567', minDigits: 8, maxDigits: 10 },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵', mask: '90 9999 9999', placeholder: '90 1234 5678', minDigits: 10, maxDigits: 10 },
];

export const DEFAULT_COUNTRY = COUNTRY_LIST[0]; // Brasil (+55)

/**
 * Busca uma configuração de país pelo código ISO (ex: 'BR', 'US') ou pelo DDI (ex: '+55')
 */
export function getCountryByCodeOrDial(codeOrDial?: string): CountryConfig {
  if (!codeOrDial) return DEFAULT_COUNTRY;
  const clean = codeOrDial.trim().toUpperCase();
  const byCode = COUNTRY_LIST.find((c) => c.code === clean);
  if (byCode) return byCode;

  const dialClean = clean.startsWith('+') ? clean : `+${clean.replace(/\D/g, '')}`;
  const byDial = COUNTRY_LIST.find((c) => c.dialCode === dialClean);
  if (byDial) return byDial;

  return DEFAULT_COUNTRY;
}

/**
 * Aplica a máscara visual definida no país aos dígitos inseridos.
 */
export function formatNationalPhone(digits: string, country: CountryConfig): string {
  const cleanDigits = digits.replace(/\D/g, '');
  if (!cleanDigits) return '';

  // Para o Brasil, suporta dinamicamente 10 dígitos (fixo) ou 11 dígitos (celular)
  if (country.code === 'BR') {
    if (cleanDigits.length <= 10) {
      // Máscara (11) 1234-5678
      let formatted = '(';
      formatted += cleanDigits.substring(0, 2);
      if (cleanDigits.length > 2) formatted += ') ' + cleanDigits.substring(2, 6);
      if (cleanDigits.length > 6) formatted += '-' + cleanDigits.substring(6, 10);
      return formatted;
    } else {
      // Máscara (11) 91234-5678
      let formatted = '(';
      formatted += cleanDigits.substring(0, 2);
      if (cleanDigits.length > 2) formatted += ') ' + cleanDigits.substring(2, 7);
      if (cleanDigits.length > 7) formatted += '-' + cleanDigits.substring(7, 11);
      return formatted;
    }
  }

  // Máscara genérica baseada em curinga '9'
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < country.mask.length && digitIndex < cleanDigits.length; i++) {
    const maskChar = country.mask[i];
    if (maskChar === '9') {
      result += cleanDigits[digitIndex];
      digitIndex++;
    } else {
      result += maskChar;
    }
  }

  // Anexa dígitos excedentes caso o número seja mais longo que a máscara gráfica
  if (digitIndex < cleanDigits.length) {
    result += ' ' + cleanDigits.substring(digitIndex);
  }

  return result;
}

/**
 * Converte qualquer entrada (formatada, com DDI ou dígitos puros) em uma string no padrão internacional E.164 (ex: '+5511999999999').
 */
export function toE164(rawInput: string, countryCode?: string): string {
  let trimmed = rawInput.trim();
  if (!trimmed) return '';

  // Se já for uma URL wa.me, extrai o número
  if (trimmed.includes('wa.me/')) {
    const match = trimmed.match(/wa\.me\/(\d+)/);
    if (match && match[1]) {
      return `+${match[1]}`;
    }
  }

  // Se a string já começa com '+', tentamos extrair o DDI
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    return `+${digitsOnly}`;
  }

  // Se for apenas dígitos locais ou formatado, aplica o DDI do país
  const country = getCountryByCodeOrDial(countryCode);
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) return '';

  const cleanDial = country.dialCode.replace(/\D/g, '');

  // Se o usuário digitou o DDI junto mas sem o '+', detecta e ajusta
  if (digitsOnly.startsWith(cleanDial) && digitsOnly.length > country.maxDigits) {
    return `+${digitsOnly}`;
  }

  return `+${cleanDial}${digitsOnly}`;
}

/**
 * Faz o parser de uma string no formato E.164 (+5511999999999) para seus componentes locais e país.
 */
export function parseE164(e164String: string, fallbackCountryCode: string = 'BR'): {
  country: CountryConfig;
  nationalNumber: string;
  formatted: string;
  e164: string;
} {
  const fallbackCountry = getCountryByCodeOrDial(fallbackCountryCode);
  if (!e164String || !e164String.trim()) {
    return {
      country: fallbackCountry,
      nationalNumber: '',
      formatted: '',
      e164: '',
    };
  }

  let cleaned = e164String.trim();
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned.replace(/\D/g, '')}`;
  }

  const digits = cleaned.replace(/\D/g, '');

  // Procura o país cujo dialCode coincide com o início dos dígitos E.164 (do maior dialCode para o menor)
  const matchedCountry = COUNTRY_LIST.slice().sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) => {
    const cDial = c.dialCode.replace(/\D/g, '');
    return digits.startsWith(cDial);
  });

  const country = matchedCountry || fallbackCountry;
  const dialDigits = country.dialCode.replace(/\D/g, '');
  const nationalNumber = digits.startsWith(dialDigits) ? digits.substring(dialDigits.length) : digits;

  return {
    country,
    nationalNumber,
    formatted: formatNationalPhone(nationalNumber, country),
    e164: `+${digits}`,
  };
}

/**
 * Valida se um número atende aos critérios do país especificado.
 */
export function isValidPhoneNumber(rawNumber: string, countryCode?: string): boolean {
  if (!rawNumber || !rawNumber.trim()) return false;
  const parsed = parseE164(toE164(rawNumber, countryCode), countryCode);
  const nationalDigits = parsed.nationalNumber.replace(/\D/g, '');

  return (
    nationalDigits.length >= parsed.country.minDigits &&
    nationalDigits.length <= parsed.country.maxDigits
  );
}
