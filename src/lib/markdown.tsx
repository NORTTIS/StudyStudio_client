import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export interface MarkdownOptions {
  /** Enable markdown table rendering */
  withTables?: boolean;
  /** Custom className for list items */
  listClassName?: string;
  /** Custom className for paragraph text */
  textClassName?: string;
  /** Custom className for the container */
  containerClassName?: string;
}

/**
 * Renders full markdown content as React elements using react-markdown + remark-gfm.
 * Supports: headings, paragraphs, lists (bullet, numbered, task), tables, blockquotes,
 * inline code, bold, italic, strikethrough, horizontal rules, and more.
 */
export function renderMarkdown(
  content: string,
  options: MarkdownOptions = {}
): React.ReactNode {
  const {
    withTables = true,
    listClassName = "list-disc space-y-1 pl-5",
    textClassName = "text-[15px] leading-7 text-[#3D3128]",
    containerClassName = "space-y-2",
  } = options;

  const components: Components = {
    // Headings
    h1: ({ children }) => (
      <h2 className="text-[18px] font-bold text-[#2B2118] mt-4 mb-1">{children}</h2>
    ),
    h2: ({ children }) => (
      <h3 className="text-[15px] font-semibold text-[#2B2118] mt-3 mb-1">{children}</h3>
    ),
    h3: ({ children }) => (
      <h4 className="text-sm font-semibold text-[#2B2118] mt-2 mb-1">{children}</h4>
    ),
    h4: ({ children }) => (
      <h5 className="text-sm font-medium text-[#2B2118] mt-2 mb-1">{children}</h5>
    ),
    h5: ({ children }) => (
      <h6 className="text-sm font-medium text-[#2B2118] mt-2 mb-1">{children}</h6>
    ),
    h6: ({ children }) => (
      <h6 className="text-xs font-medium text-[#2B2118] mt-2 mb-1">{children}</h6>
    ),

    // Paragraph
    p: ({ children }) => (
      <p className={`whitespace-pre-wrap ${textClassName}`}>{children}</p>
    ),

    // Lists
    ul: ({ children }) => (
      <ul className={listClassName}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal space-y-1 pl-5">{children}</ol>
    ),
    li: ({ children, ...props }) => {
      // Task list items (input checkbox inside li)
      if (Array.isArray(children)) {
        const child = children.find(
          (c) => React.isValidElement(c) && (c as React.ReactElement<{ type?: string }>).type === "input"
        );
        if (child) {
          return <li className="flex items-start gap-2">{children}</li>;
        }
      }
      return <li className="text-[#3D3128]">{children}</li>;
    },

    // Task list (input checkbox)
    input: ({ type, checked, ...props }) => {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1 h-4 w-4 shrink-0 accent-[#F97316]"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },

    // Blockquote
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#D97706] pl-3 italic text-[#7A6858] my-2">
        {children}
      </blockquote>
    ),

    // Inline code
    code: ({ className, children, ...props }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <pre className="overflow-x-auto rounded-lg bg-[#1E1B18] p-3 text-sm text-[#F5E6D3]">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      }
      return (
        <code className="rounded bg-[#F5EDE6] px-1 py-0.5 text-[13px] font-mono text-[#C2410C]" {...props}>
          {children}
        </code>
      );
    },

    // Horizontal rule
    hr: () => <hr className="border-[#E0DDDA] my-3" />,

    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#D97706] underline underline-offset-2 hover:text-[#B45309] focus-visible:outline-2 focus-visible:outline-[#D97706] focus-visible:outline-offset-2 active:text-[#9A3412]">
        {children}
      </a>
    ),

    // Strong, em, del
    strong: ({ children }) => <strong className="font-semibold text-[#2B2118]">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="text-[#9C8C80] line-through">{children}</del>,
  };

  if (withTables) {
    components.table = ({ children }) => (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">{children}</table>
      </div>
    );
    components.thead = ({ children }) => <thead className="bg-[#FAF7F4]">{children}</thead>;
    components.th = ({ children }) => (
      <th className="border border-[#E8E0D8] px-3 py-2 font-semibold text-[#2B2118]">{children}</th>
    );
    components.td = ({ children }) => (
      <td className="border border-[#E8E0D8] px-3 py-2 align-top text-[#3D3128]">{children}</td>
    );
    components.tr = ({ children }) => <tr className="even:bg-[#FDFCFB]">{children}</tr>;
  }

  return (
    <div className={containerClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
