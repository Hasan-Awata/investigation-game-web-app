import { useCallback } from 'react';

export function useDynamicList<T>(
  list: T[] = [],
  onChange: (newList: T[]) => void
) {
  const add = useCallback((newItem: T) => {
    onChange([...list, newItem]);
  }, [list, onChange]);

  const update = useCallback((index: number, field: keyof T, value: any) => {
    const newList = [...list];
    newList[index] = { ...newList[index], [field]: value };
    onChange(newList);
  }, [list, onChange]);

  const updatePrimitive = useCallback((index: number, value: T) => {
    const newList = [...list];
    newList[index] = value;
    onChange(newList);
  }, [list, onChange]);

  const remove = useCallback((index: number, resequenceField?: keyof T) => {
    let newList = list.filter((_, i) => i !== index);
    if (resequenceField) {
      // Safely map and re-assign the sequence field (e.g., page_number)
      newList = newList.map((item, i) => ({ ...item, [resequenceField]: i + 1 }));
    }
    onChange(newList);
  }, [list, onChange]);

  return { items: list, add, update, updatePrimitive, remove };
}