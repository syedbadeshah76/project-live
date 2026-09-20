import { useRef, useEffect, useState } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon,
  Heading1, Heading2, AlignLeft, AlignCenter, AlignRight, Code, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

/**
 * Lightweight WYSIWYG editor that produces sanitized HTML suitable for
 * transactional emails. Output shape matches the reference at
 * https://wysiwyghtml.com/ (basic formatting, headings, lists, links, alignment).
 */
export const HtmlEditor = ({ value, onChange, placeholder, minHeight = 180, className }: HtmlEditorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Keep DOM in sync only when the incoming value differs from current contents
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };

  const handleLink = () => {
    const url = window.prompt("Enter URL");
    if (url) exec("createLink", url);
  };

  const tools = [
    { icon: Undo, label: "Undo", action: () => exec("undo") },
    { icon: Redo, label: "Redo", action: () => exec("redo") },
    { divider: true },
    { icon: Heading1, label: "H1", action: () => exec("formatBlock", "H1") },
    { icon: Heading2, label: "H2", action: () => exec("formatBlock", "H2") },
    { icon: Bold, label: "Bold", action: () => exec("bold") },
    { icon: Italic, label: "Italic", action: () => exec("italic") },
    { icon: Underline, label: "Underline", action: () => exec("underline") },
    { divider: true },
    { icon: List, label: "Bulleted list", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", action: () => exec("insertOrderedList") },
    { icon: LinkIcon, label: "Link", action: handleLink },
    { divider: true },
    { icon: AlignLeft, label: "Align left", action: () => exec("justifyLeft") },
    { icon: AlignCenter, label: "Align center", action: () => exec("justifyCenter") },
    { icon: AlignRight, label: "Align right", action: () => exec("justifyRight") },
    { icon: Code, label: "Code", action: () => exec("formatBlock", "PRE") },
  ] as const;

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-background overflow-hidden transition",
        focused && "ring-2 ring-ring ring-offset-0",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        {tools.map((t, i) =>
          "divider" in t ? (
            <span key={i} className="mx-1 h-5 w-px bg-border" />
          ) : (
            <Button
              key={i}
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={t.action}
              aria-label={t.label}
              title={t.label}
            >
              <t.icon className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onPaste={(e) => {
          // Paste as plain text to avoid inheriting external styles
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        data-placeholder={placeholder}
        className="prose prose-sm max-w-none px-4 py-3 focus:outline-none text-sm text-foreground [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default HtmlEditor;
