"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  RemoveFormatting,
  Heading2,
  Heading3,
  Minus,
  ImageIcon,
  Table as TableIcon,
  Palette,
  Highlighter,
  IndentIncrease,
  IndentDecrease,
  Code,
  ChevronDown,
  Loader2,
  Plus,
  Rows3,
  Columns3,
  Trash2,
  BetweenHorizontalStart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bodyToEditorHtml } from "@/lib/article-body";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  minHeight?: string;
  placeholder?: string;
};

const TEXT_COLORS = [
  { label: "Mặc định", value: "" },
  { label: "Đen", value: "#0f172a" },
  { label: "Xám", value: "#64748b" },
  { label: "Đỏ", value: "#dc2626" },
  { label: "Cam", value: "#ea580c" },
  { label: "Vàng", value: "#ca8a04" },
  { label: "Xanh lá", value: "#16a34a" },
  { label: "Emerald", value: "#059669" },
  { label: "Xanh dương", value: "#2563eb" },
  { label: "Tím", value: "#7c3aed" },
  { label: "Hồng", value: "#db2777" },
  { label: "Trắng", value: "#ffffff" },
];

const HIGHLIGHT_COLORS = [
  { label: "Không", value: "" },
  { label: "Vàng", value: "#fef08a" },
  { label: "Xanh mint", value: "#bbf7d0" },
  { label: "Xanh sky", value: "#bae6fd" },
  { label: "Hồng", value: "#fbcfe8" },
  { label: "Cam", value: "#fed7aa" },
  { label: "Tím", value: "#e9d5ff" },
];

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded border border-transparent px-1 text-slate-600 transition-colors",
        "hover:border-slate-300 hover:bg-white hover:text-slate-900",
        "disabled:opacity-40 disabled:pointer-events-none",
        active && "border-slate-300 bg-white text-slate-900 shadow-sm",
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300/80" aria-hidden />;
}

async function uploadImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || "Upload thất bại");
  return d.url as string;
}

function insertUploadedImage(editor: Editor, url: string, alt?: string) {
  editor
    .chain()
    .focus()
    .setImage({ src: url, alt: alt || "Hình bài viết" })
    .run();
}

/**
 * WordPress Classic Editor–style WYSIWYG with kitchen sink:
 * media upload, tables, text/highlight color, Visual + Text tabs.
 */
export function ClassicEditor({
  value,
  onChange,
  className,
  minHeight = "360px",
  placeholder = "Bắt đầu viết nội dung bài viết…",
}: Props) {
  const [mode, setMode] = useState<"visual" | "text">("visual");
  const [textSource, setTextSource] = useState("");
  const [kitchenSink, setKitchenSink] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const skipEmit = useRef(false);
  const lastExternal = useRef(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ảnh tối đa 8MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      const ed = editorRef.current;
      if (ed) {
        insertUploadedImage(ed, url, file.name.replace(/\.[^.]+$/, "") || "Ảnh");
        toast.success("Đã chèn ảnh");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload ảnh lỗi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const imageHandlerRef = useRef(handleImageFile);
  imageHandlerRef.current = handleImageFile;

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        codeBlock: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-600 underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "classic-editor-img",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "classic-editor-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: bodyToEditorHtml(value || ""),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "classic-editor-prose prose prose-sm sm:prose-base max-w-none focus:outline-none",
          "px-3 sm:px-4 py-3 min-h-[280px] text-slate-800 leading-relaxed"
        ),
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;
        const file = event.dataTransfer.files[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        void imageHandlerRef.current(file);
        return true;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void imageHandlerRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipEmit.current) return;
      const html = ed.getHTML();
      lastExternal.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external value (AI generate / load draft)
  useEffect(() => {
    if (!editor) return;
    if (value === lastExternal.current) return;
    lastExternal.current = value;
    skipEmit.current = true;
    editor.commands.setContent(bodyToEditorHtml(value || ""), {
      emitUpdate: false,
    });
    skipEmit.current = false;
    if (mode === "text") {
      setTextSource(value || "");
    }
  }, [value, editor, mode]);

  const switchMode = useCallback(
    (next: "visual" | "text") => {
      if (!editor || next === mode) return;
      if (next === "text") {
        const html = editor.getHTML();
        setTextSource(html);
        setMode("text");
      } else {
        skipEmit.current = true;
        editor.commands.setContent(bodyToEditorHtml(textSource), {
          emitUpdate: false,
        });
        skipEmit.current = false;
        const html = editor.getHTML();
        lastExternal.current = html;
        onChange(html);
        setMode("visual");
      }
    },
    [editor, mode, textSource, onChange]
  );

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL liên kết:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImageByUrl = () => {
    if (!editor) return;
    const url = window.prompt("URL ảnh (https://… hoặc dán link):", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url, alt: "Hình bài viết" }).run();
  };

  const insertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded border border-slate-300 bg-slate-50 animate-pulse",
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  const inTable = editor.isActive("table");

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-slate-300 bg-white shadow-sm",
        className
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImageFile(f);
        }}
      />

      {/* WP-style header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-[#f6f7f7] px-2 py-1.5">
        <span className="text-[11px] font-medium text-slate-500 px-1 hidden sm:inline">
          Nội dung · Classic Editor
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setKitchenSink((v) => !v)}
            className={cn(
              "hidden sm:inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors",
              kitchenSink
                ? "border-slate-300 bg-white text-slate-800 shadow-sm"
                : "border-slate-200 bg-[#f0f0f1] text-slate-600 hover:bg-white"
            )}
            title="Bật/tắt toolbar nâng cao (Kitchen Sink)"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                kitchenSink && "rotate-180"
              )}
            />
            Kitchen Sink
          </button>
          <div className="flex rounded border border-slate-300 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => switchMode("visual")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                mode === "visual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-[#f0f0f1] text-slate-600 hover:bg-white/80"
              )}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => switchMode("text")}
              className={cn(
                "px-3 py-1.5 border-l border-slate-300 transition-colors",
                mode === "text"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-[#f0f0f1] text-slate-600 hover:bg-white/80"
              )}
            >
              Text
            </button>
          </div>
        </div>
      </div>

      {mode === "visual" && (
        <>
          {/* Row 1 — core formatting */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-[#f6f7f7] px-1.5 py-1">
            <select
              className="h-8 max-w-[130px] rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-700 mr-0.5"
              value={
                editor.isActive("heading", { level: 2 })
                  ? "h2"
                  : editor.isActive("heading", { level: 3 })
                    ? "h3"
                    : editor.isActive("heading", { level: 4 })
                      ? "h4"
                      : "p"
              }
              onChange={(e) => {
                const v = e.target.value;
                const chain = editor.chain().focus();
                if (v === "p") chain.setParagraph().run();
                else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
                else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
                else if (v === "h4") chain.toggleHeading({ level: 4 }).run();
              }}
              title="Đoạn / Heading"
            >
              <option value="p">Paragraph</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>

            <Divider />

            <ToolbarBtn
              title="In đậm (Ctrl+B)"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="In nghiêng (Ctrl+I)"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Gạch chân"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Gạch ngang"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <Divider />

            <div className="relative">
              <ToolbarBtn
                title="Màu chữ"
                active={!!editor.getAttributes("textStyle").color || colorOpen}
                onClick={() => {
                  setColorOpen((v) => !v);
                  setHighlightOpen(false);
                }}
              >
                <Palette className="h-3.5 w-3.5" />
              </ToolbarBtn>
              {colorOpen && (
                <div className="absolute left-0 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5 px-0.5">
                    Màu chữ
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        title={c.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!c.value) editor.chain().focus().unsetColor().run();
                          else editor.chain().focus().setColor(c.value).run();
                          setColorOpen(false);
                        }}
                        className={cn(
                          "h-6 w-6 rounded border border-slate-200",
                          !c.value &&
                            "bg-[linear-gradient(135deg,#fff_45%,#ef4444_45%,#ef4444_55%,#fff_55%)]"
                        )}
                        style={c.value ? { backgroundColor: c.value } : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <ToolbarBtn
                title="Tô nền chữ"
                active={editor.isActive("highlight") || highlightOpen}
                onClick={() => {
                  setHighlightOpen((v) => !v);
                  setColorOpen(false);
                }}
              >
                <Highlighter className="h-3.5 w-3.5" />
              </ToolbarBtn>
              {highlightOpen && (
                <div className="absolute left-0 top-9 z-30 w-40 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="text-[10px] font-semibold text-slate-500 mb-1.5 px-0.5">
                    Highlight
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        title={c.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!c.value) editor.chain().focus().unsetHighlight().run();
                          else
                            editor
                              .chain()
                              .focus()
                              .toggleHighlight({ color: c.value })
                              .run();
                          setHighlightOpen(false);
                        }}
                        className={cn(
                          "h-6 w-6 rounded border border-slate-200",
                          !c.value && "bg-white"
                        )}
                        style={c.value ? { backgroundColor: c.value } : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Divider />

            <ToolbarBtn
              title="Danh sách chấm"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Danh sách số"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Trích dẫn"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <Divider />

            <ToolbarBtn
              title="Căn trái"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Căn giữa"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Căn phải"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Căn đều"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <Divider />

            <ToolbarBtn title="Chèn / sửa link" active={editor.isActive("link")} onClick={setLink}>
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Gỡ link"
              disabled={!editor.isActive("link")}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <ToolbarBtn
              title="Upload ảnh từ máy"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
            </ToolbarBtn>
            <ToolbarBtn title="Chèn ảnh bằng URL" onClick={insertImageByUrl}>
              <span className="text-[10px] font-bold px-0.5">URL</span>
            </ToolbarBtn>
            <ToolbarBtn title="Chèn bảng 3×3" onClick={insertTable}>
              <TableIcon className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <Divider />

            <ToolbarBtn
              title="Hoàn tác"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Làm lại"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarBtn>
            <ToolbarBtn
              title="Xóa định dạng"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <ToolbarBtn
              title="Kitchen Sink"
              active={kitchenSink}
              className="sm:hidden"
              onClick={() => setKitchenSink((v) => !v)}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  kitchenSink && "rotate-180"
                )}
              />
            </ToolbarBtn>
          </div>

          {kitchenSink && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-[#f0f0f1] px-1.5 py-1">
              <ToolbarBtn
                title="Heading 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Heading 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                <Heading3 className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Đường kẻ ngang"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Code inline"
                active={editor.isActive("code")}
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <Code className="h-3.5 w-3.5" />
              </ToolbarBtn>

              <Divider />

              <ToolbarBtn
                title="Tăng indent list"
                onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              >
                <IndentIncrease className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Giảm indent list"
                onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              >
                <IndentDecrease className="h-3.5 w-3.5" />
              </ToolbarBtn>

              <Divider />

              <span className="text-[10px] text-slate-400 px-1 self-center hidden sm:inline">
                Bảng:
              </span>
              <ToolbarBtn title="Chèn bảng 3×3" onClick={insertTable}>
                <Plus className="h-3 w-3" />
                <TableIcon className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Thêm hàng dưới"
                disabled={!inTable}
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <Rows3 className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Thêm cột bên phải"
                disabled={!inTable}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <Columns3 className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Xóa hàng"
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                <BetweenHorizontalStart className="h-3.5 w-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                title="Xóa bảng"
                disabled={!inTable}
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </ToolbarBtn>

              <Divider />

              <span className="text-[10px] text-slate-400 px-1 self-center">
                {uploading ? "Đang upload ảnh…" : "Kéo thả / dán ảnh vào editor"}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-[#fafafa] px-2 py-1.5">
            <span className="text-[10px] text-slate-400 self-center mr-1">Chèn nhanh:</span>
            {[
              {
                l: "H2 mục",
                run: () =>
                  editor.chain().focus().insertContent("<h2>Tiêu đề mục</h2><p></p>").run(),
              },
              {
                l: "H3",
                run: () =>
                  editor.chain().focus().insertContent("<h3>Tiêu đề con</h3><p></p>").run(),
              },
              {
                l: "List",
                run: () => editor.chain().focus().toggleBulletList().run(),
              },
              { l: "Bảng", run: insertTable },
              {
                l: "Ảnh",
                run: () => fileRef.current?.click(),
              },
              {
                l: "FAQ",
                run: () =>
                  editor
                    .chain()
                    .focus()
                    .insertContent(
                      "<h2>FAQ</h2><h3>Câu hỏi thường gặp?</h3><p>Trả lời ngắn gọn, có từ khóa.</p><p></p>"
                    )
                    .run(),
              },
              {
                l: "CTA",
                run: () =>
                  editor
                    .chain()
                    .focus()
                    .insertContent(
                      '<h2>Bước tiếp theo</h2><p><strong style="color: #059669">Liên hệ tư vấn / Đăng ký nhận bản tin ngay hôm nay.</strong></p><p></p>'
                    )
                    .run(),
              },
            ].map((b) => (
              <Button
                key={b.l}
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2 bg-white"
                disabled={uploading && b.l === "Ảnh"}
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.run}
              >
                {b.l}
              </Button>
            ))}
          </div>

          <div
            className="bg-white classic-editor-shell"
            onClick={() => {
              setColorOpen(false);
              setHighlightOpen(false);
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </>
      )}

      {mode === "text" && (
        <textarea
          value={textSource}
          onChange={(e) => {
            setTextSource(e.target.value);
            lastExternal.current = e.target.value;
            onChange(e.target.value);
          }}
          className="w-full resize-y border-0 bg-[#f9f9f9] px-3 py-3 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-0"
          style={{ minHeight }}
          spellCheck={false}
          placeholder="HTML / mã nguồn (img, table, style color)…"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 bg-[#f6f7f7] px-2 py-1 text-[10px] text-slate-400">
        <span>
          {mode === "visual"
            ? `Classic Editor · Visual${kitchenSink ? " · Kitchen Sink" : ""}`
            : "Classic Editor · Text (HTML)"}
        </span>
        <span className="hidden sm:inline">
          Ảnh · Bảng · Màu chữ · Highlight · Upload / kéo thả / dán
        </span>
      </div>
    </div>
  );
}
