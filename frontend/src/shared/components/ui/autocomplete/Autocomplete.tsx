import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { Search, Loader2 } from 'lucide-react';
import styles from './Autocomplete.module.css';

export interface AutocompleteProps<T> {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  results: T[];
  isLoading: boolean;
  renderItem: (item: T, isHighlighted: boolean) => ReactNode;
  onSelect: (item: T) => void;
  minChars?: number;
  disabled?: boolean;
  id?: string;
  emptyStateMessage?: string;
  searchingMessage?: string;
}

export function Autocomplete<T>({
  placeholder = 'Buscar...',
  value = '',
  onSearch,
  results,
  isLoading,
  renderItem,
  onSelect,
  minChars = 2,
  disabled = false,
  id,
  emptyStateMessage = 'Nenhum resultado encontrado',
  searchingMessage = 'Buscando...',
}: AutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      setHighlightedIndex(-1);
      onSearch(val);
      setIsOpen(val.length >= minChars);
    },
    [minChars, onSearch]
  );

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && results[highlightedIndex]) {
            handleSelect(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, highlightedIndex, handleSelect]
  );

  const showDropdown = isOpen && (isLoading || results.length > 0 || inputValue.length >= minChars);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <Search className={styles.searchIcon} size={15} />
        <input
          ref={inputRef}
          id={id}
          className={styles.input}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length >= minChars) setIsOpen(true);
          }}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {isLoading && <Loader2 className={styles.loadingIcon} size={15} />}
      </div>

      {showDropdown && (
        <div className={styles.dropdown} role="listbox">
          {isLoading && results.length === 0 ? (
            <div className={styles.stateMessage}>{searchingMessage}</div>
          ) : results.length === 0 ? (
            <div className={styles.stateMessage}>{emptyStateMessage}</div>
          ) : (
            results.map((item, index) => (
              <div
                key={index}
                className={[styles.item, index === highlightedIndex ? styles.highlighted : ''].join(' ')}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(item);
                }}
              >
                {renderItem(item, index === highlightedIndex)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
