"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
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
} from "lucide-react";
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

function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded border border-transparent text-slate-600 transition-colors",
        "hover:border-slate-300 hover:bg-white hover:text-slate-900",
        "disabled:opacity-40 disabled:pointer-events-none",
        active && "border-slate-300 bg-white text-slate-900 shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-slate-300/80" aria-hidden />;
}

/**
 * WordPress Classic Editor–style WYSIWYG:
 * Visual toolbar + content area, with Text (HTML) tab.
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
  const skipEmit = useRef(false);
  const lastExternal = useRef(value);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-600 underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
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
    },
    onUpdate: ({ editor: ed }) => {
      if (skipEmit.current) return;
      const html = ed.getHTML();
      lastExternal.current = html;
      onChange(html);
    },
  });

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
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
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

  return (
    <div
      className={cn(
        "overflow-hidden rounded border border-slate-300 bg-white shadow-sm",
        className
      )}
    >
      {/* WP-style header: label + Visual / Text tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-[#f6f7f7] px-2 py-1.5">
        <span className="text-[11px] font-medium text-slate-500 px-1 hidden sm:inline">
          Nội dung
        </span>
        <div className="flex rounded border border-slate-300 overflow-hidden text-xs font-medium ml-auto">
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

      {mode === "visual" && (
        <>
          {/* Toolbar row 1 — Classic “kitchen sink” style */}
          <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-[#f6f7f7] px-1.5 py-1">
            <select
              className="h-8 max-w-[140px] rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-700 mr-0.5"
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
              title="Đường kẻ ngang"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolbarBtn>

            <Divider />

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

            <Divider />

            <ToolbarBtn
              title="Xóa định dạng"
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarBtn>
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
          </div>

          {/* Quick inserts (FAQ / CTA) */}
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-[#fafafa] px-2 py-1.5">
            <span className="text-[10px] text-slate-400 self-center mr-1">Chèn nhanh:</span>
            {[
              {
                l: "H2 mục",
                run: () =>
                  editor
                    .chain()
                    .focus()
                    .insertContent("<h2>Tiêu đề mục</h2><p></p>")
                    .run(),
              },
              {
                l: "H3",
                run: () =>
                  editor
                    .chain()
                    .focus()
                    .insertContent("<h3>Tiêu đề con</h3><p></p>")
                    .run(),
              },
              {
                l: "List",
                run: () =>
                  editor.chain().focus().toggleBulletList().run(),
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
                      "<h2>Bước tiếp theo</h2><p><strong>Liên hệ tư vấn / Đăng ký nhận bản tin ngay hôm nay.</strong></p><p></p>"
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
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.run}
              >
                {b.l}
              </Button>
            ))}
          </div>

          <div className="bg-white classic-editor-shell">
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
          placeholder="HTML / mã nguồn bài viết…"
        />
      )}

      <div className="flex items-center justify-between border-t border-slate-200 bg-[#f6f7f7] px-2 py-1 text-[10px] text-slate-400">
        <span>
          {mode === "visual"
            ? "Classic Editor · Visual"
            : "Classic Editor · Text (HTML)"}
        </span>
        <span className="hidden sm:inline">WordPress-style · H1 dùng ô tiêu đề riêng</span>
      </div>
    </div>
  );
}
