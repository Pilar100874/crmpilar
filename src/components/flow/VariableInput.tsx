import { useState, useRef, forwardRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Variable } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariableAutocomplete } from "./VariableAutocomplete";

interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVariableRequest: () => void;
}

interface VariableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVariableRequest: () => void;
}

export const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
  ({ onVariableRequest, className, onChange, value, ...props }, ref) => {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
    const [searchTerm, setSearchTerm] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      
      // Detectar se o usuário digitou {{
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
      
      if (lastOpenBraces !== -1 && !textBeforeCursor.slice(lastOpenBraces).includes("}}")) {
        const searchText = textBeforeCursor.slice(lastOpenBraces + 2);
        setSearchTerm(searchText);
        setShowAutocomplete(true);
        setCursorPosition(lastOpenBraces);
        
        // Calcular posição do autocomplete
        const rect = e.target.getBoundingClientRect();
        setAutocompletePosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      } else {
        setShowAutocomplete(false);
      }
      
      onChange?.(e);
    }, [onChange]);

    const handleVariableSelect = useCallback((variable: string) => {
      if (inputRef.current) {
        const currentValue = inputRef.current.value;
        const beforeCursor = currentValue.slice(0, cursorPosition);
        const afterCursor = currentValue.slice(inputRef.current.selectionStart || 0);
        
        // Remover o {{ digitado e inserir a variável completa
        const newValue = beforeCursor + variable + afterCursor;
        
        const event = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange?.(event);
        setShowAutocomplete(false);
        
        // Mover cursor para depois da variável
        setTimeout(() => {
          if (inputRef.current) {
            const newCursorPos = cursorPosition + variable.length;
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            inputRef.current.focus();
          }
        }, 0);
      }
    }, [cursorPosition, onChange]);

    return (
      <div className="relative">
        <Input
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (inputRef as any).current = node;
          }}
          className={cn("pr-10", className)}
          onChange={handleInputChange}
          value={value}
          {...props}
        />
        <button
          type="button"
          onClick={onVariableRequest}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-1 transition-colors"
          title="Abrir seletor de variáveis"
        >
          <Variable className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {showAutocomplete && (
          <VariableAutocomplete
            searchTerm={searchTerm}
            position={autocompletePosition}
            onSelect={handleVariableSelect}
            onClose={() => setShowAutocomplete(false)}
          />
        )}
      </div>
    );
  }
);
VariableInput.displayName = "VariableInput";

export const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  ({ onVariableRequest, className, rows = 3, onChange, value, ...props }, ref) => {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
    const [searchTerm, setSearchTerm] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      
      // Detectar se o usuário digitou {{
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastOpenBraces = textBeforeCursor.lastIndexOf("{{");
      
      if (lastOpenBraces !== -1 && !textBeforeCursor.slice(lastOpenBraces).includes("}}")) {
        const searchText = textBeforeCursor.slice(lastOpenBraces + 2);
        setSearchTerm(searchText);
        setShowAutocomplete(true);
        setCursorPosition(lastOpenBraces);
        
        // Calcular posição do autocomplete
        const rect = e.target.getBoundingClientRect();
        setAutocompletePosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      } else {
        setShowAutocomplete(false);
      }
      
      onChange?.(e);
    }, [onChange]);

    const handleVariableSelect = useCallback((variable: string) => {
      if (textareaRef.current) {
        const currentValue = textareaRef.current.value;
        const beforeCursor = currentValue.slice(0, cursorPosition);
        const afterCursor = currentValue.slice(textareaRef.current.selectionStart || 0);
        
        // Remover o {{ digitado e inserir a variável completa
        const newValue = beforeCursor + variable + afterCursor;
        
        const event = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        
        onChange?.(event);
        setShowAutocomplete(false);
        
        // Mover cursor para depois da variável
        setTimeout(() => {
          if (textareaRef.current) {
            const newCursorPos = cursorPosition + variable.length;
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            textareaRef.current.focus();
          }
        }, 0);
      }
    }, [cursorPosition, onChange]);

    return (
      <div className="relative">
        <Textarea
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            (textareaRef as any).current = node;
          }}
          className={cn("pr-10", className)}
          rows={rows}
          onChange={handleTextareaChange}
          value={value}
          {...props}
        />
        <button
          type="button"
          onClick={onVariableRequest}
          className="absolute right-2 top-2 hover:bg-accent rounded p-1 transition-colors"
          title="Abrir seletor de variáveis"
        >
          <Variable className="w-4 h-4 text-muted-foreground" />
        </button>
        
        {showAutocomplete && (
          <VariableAutocomplete
            searchTerm={searchTerm}
            position={autocompletePosition}
            onSelect={handleVariableSelect}
            onClose={() => setShowAutocomplete(false)}
          />
        )}
      </div>
    );
  }
);
VariableTextarea.displayName = "VariableTextarea";
