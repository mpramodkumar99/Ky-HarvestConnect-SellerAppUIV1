import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet,
} from 'react-native';
import { type CatalogSuggestion, searchCatalogItems } from '@/services/catalog-api';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  value:       string;
  onChange:    (value: string) => void;
  onSelect:    (item: CatalogSuggestion) => void;
  placeholder?: string;
  maxLength?:  number;
}

export function ProductNameSearch({ value, onChange, onSelect, placeholder, maxLength }: Props) {
  const c = useAppColors();
  const s = makeStyles(c);

  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchCatalogItems(value);
      setSuggestions(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  function handleSelect(item: CatalogSuggestion) {
    onChange(item.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(item);
  }

  return (
    <View style={s.wrapper}>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder={placeholder ?? 'e.g. Rice, Turmeric, Electrician…'}
          placeholderTextColor={c.textFaint}
          value={value}
          onChangeText={onChange}
          maxLength={maxLength ?? 120}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && (
          <ActivityIndicator size="small" color={c.primaryText} style={s.spinner} />
        )}
      </View>

      {open && suggestions.length > 0 && (
        <View style={s.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={suggestions.length > 4}
            style={{ maxHeight: 220 }}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [s.row, pressed && s.rowPressed]} onPress={() => handleSelect(item)}>
                <View style={s.rowLeft}>
                  <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.rowMeta} numberOfLines={1}>
                    {item.category.replace('_', ' ')} · {item.subCategory.replace('_', ' ')} · {item.unit}
                  </Text>
                </View>
                <Text style={s.rowArrow}>→</Text>
              </Pressable>
            )}
          />
          <Pressable style={s.dismissRow} onPress={() => setOpen(false)}>
            <Text style={s.dismissTxt}>✕ close suggestions</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    wrapper:    { gap: 0 },
    inputRow:   { flexDirection: 'row', alignItems: 'center' },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.borderMid,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.bgScreen,
    },
    spinner: { position: 'absolute', right: 12 },
    dropdown: {
      marginTop: 4,
      backgroundColor: c.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderMid,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    rowPressed:  { backgroundColor: c.bgSubtle },
    rowLeft:     { flex: 1, gap: 2 },
    rowName:     { fontSize: 14, fontWeight: '600', color: c.text },
    rowMeta:     { fontSize: 11, color: c.textFaint, textTransform: 'capitalize' },
    rowArrow:    { fontSize: 14, color: c.textFaint },
    separator:   { height: 1, backgroundColor: c.borderLight, marginLeft: 14 },
    dismissRow: {
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignItems: 'center',
    },
    dismissTxt:  { fontSize: 11, color: c.textFaint },
  });
}
