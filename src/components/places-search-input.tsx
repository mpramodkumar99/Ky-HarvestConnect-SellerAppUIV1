import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

const PLACES_KEY      = 'AIzaSyAWcTKuepfygLZhGejYPhOIaIBuoRriSUw';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_BASE_URL = 'https://places.googleapis.com/v1/places';
const NEARBY_URL       = 'https://places.googleapis.com/v1/places:searchNearby';

interface Prediction {
  placeId:       string;
  mainText:      string;
  secondaryText: string;
}

export interface PlaceDetail {
  location: string;   // "Navipet, Nizamabad, Telangana"
  pincode:  string;   // "503245" — empty string if not found
  lat:      number;
  lng:      number;
}

interface Props {
  value:         string;
  placeholder?:  string;
  onSelect:      (detail: PlaceDetail) => void;
  onChangeText?: (text: string) => void;
}

type AddrComp = { longText: string; types: string[] };

async function fetchNearbyPincode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(NEARBY_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  PLACES_KEY,
        'X-Goog-FieldMask': 'places.addressComponents',
      },
      body: JSON.stringify({
        includedTypes: ['postal_code'],
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 3000 },
        },
        maxResultCount: 1,
      }),
    });
    const data  = await res.json();
    const comps = (data.places?.[0]?.addressComponents ?? []) as AddrComp[];
    return comps.find(c => c.types.includes('postal_code'))?.longText ?? '';
  } catch {
    return '';
  }
}

export function PlacesSearchInput({ value, placeholder, onSelect, onChangeText }: Props) {
  const c = useAppColors();
  const s = makeStyles(c);

  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [loading,     setLoading]     = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChangeText?.(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.length < 3) { setSuggestions([]); return; }
    debounce.current = setTimeout(() => fetchSuggestions(text), 350);
  }

  async function fetchSuggestions(input: string) {
    setLoading(true);
    try {
      const res  = await fetch(AUTOCOMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
        },
        body: JSON.stringify({ input, includedRegionCodes: ['in'], languageCode: 'en' }),
      });
      const data = await res.json();
      const raw  = (data.suggestions ?? []) as Array<{
        placePrediction: {
          placeId: string;
          structuredFormat: { mainText: { text: string }; secondaryText: { text: string } };
        };
      }>;
      setSuggestions(
        raw.map(s => ({
          placeId:       s.placePrediction.placeId,
          mainText:      s.placePrediction.structuredFormat.mainText.text,
          secondaryText: s.placePrediction.structuredFormat.secondaryText?.text ?? '',
        })),
      );
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(prediction: Prediction) {
    setSuggestions([]);
    setLoading(true);
    try {
      const res  = await fetch(`${DETAILS_BASE_URL}/${prediction.placeId}`, {
        headers: {
          'X-Goog-Api-Key':   PLACES_KEY,
          'X-Goog-FieldMask': 'displayName,formattedAddress,location,addressComponents',
        },
      });
      const data = await res.json();

      const comps    = (data.addressComponents ?? []) as AddrComp[];
      const get      = (...types: string[]) =>
        comps.find(c => types.some(t => c.types.includes(t)))?.longText ?? '';

      const locality = get('locality', 'sublocality_level_1', 'sublocality');
      const district = get('administrative_area_level_3', 'administrative_area_level_2');
      const state    = get('administrative_area_level_1');
      const lat      = data.location?.latitude  ?? 0;
      const lng      = data.location?.longitude ?? 0;

      // Primary: postal_code from address components
      // Fallback: nearest postal_code via searchNearby (handles city-level selections)
      let pincode = get('postal_code');
      if (!pincode && lat && lng) {
        pincode = await fetchNearbyPincode(lat, lng);
      }

      const locationParts = [locality || data.displayName?.text, district, state].filter(Boolean);
      const location      = locationParts.join(', ');

      onChangeText?.(location);
      onSelect({ location, pincode, lat, lng });
    } catch {}
    setLoading(false);
  }

  return (
    <View>
      <View style={s.inputRow}>
        <Text style={s.searchIcon}>📍</Text>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder ?? 'Search your store location…'}
          placeholderTextColor={c.textFaint}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={c.primary} style={s.spinner} />}
      </View>

      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map((p, i) => (
            <Pressable
              key={p.placeId}
              style={[s.suggestion, i > 0 && s.suggestionBorder]}
              onPress={() => handleSelect(p)}>
              <Text style={s.suggestionMain} numberOfLines={1}>{p.mainText}</Text>
              <Text style={s.suggestionSub}  numberOfLines={1}>{p.secondaryText}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    inputRow: {
      flexDirection:     'row',
      alignItems:        'center',
      borderWidth:       1.5,
      borderColor:       c.border,
      borderRadius:      12,
      backgroundColor:   c.bgScreen,
      paddingHorizontal: 12,
    },
    searchIcon: { fontSize: 15, marginRight: 8 },
    input: {
      flex:            1,
      paddingVertical: 11,
      fontSize:        14,
      color:           c.text,
    },
    spinner: { marginLeft: 6 },

    dropdown: {
      marginTop:       4,
      borderWidth:     1,
      borderColor:     c.borderMid,
      borderRadius:    12,
      backgroundColor: c.bg,
      overflow:        'hidden',
      elevation:       4,
      shadowColor:     '#000',
      shadowOffset:    { width: 0, height: 2 },
      shadowOpacity:   0.08,
      shadowRadius:    8,
    },
    suggestion: {
      paddingHorizontal: 14,
      paddingVertical:   11,
      backgroundColor:   c.bg,
    },
    suggestionBorder: {
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    suggestionMain: {
      fontSize:   13,
      fontWeight: '600',
      color:      c.text,
    },
    suggestionSub: {
      fontSize:  11,
      color:     c.textFaint,
      marginTop: 2,
    },
  });
}
