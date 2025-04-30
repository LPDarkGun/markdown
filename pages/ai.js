// pages/index.jsx
import { useState, useEffect, useRef } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useRouter } from "next/router"

const API_KEY =
  "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjA2ZmE5OWEzLWE3MjItNGIxZS1iZTEwLWUxZTU3MjU2OGUzZiIsImV4cCI6NDg5OTMyNzIwMX0.fpiCGl4C32GZ4prMHwWJtchy0hW25SNfpxkyS-CJSADsXDe_pSZZMBIdZ4s-aXM4srSWbCdoJj3hGggY2Mi-_w"

const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are a technical assistant. When given code, reply with a short summary under 150 words.",
}

const formatMessage = (content) => {
  if (!content) return []

  // First, extract code blocks
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const sections = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      sections.push({
        type: "markdown",
        content: content.substring(lastIndex, match.index),
      })
    }

    // Add code block with language
    sections.push({
      type: "code",
      language: match[1] || "text", // Default to text if no language specified
      content: match[2].trim(),
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    sections.push({
      type: "markdown",
      content: content.substring(lastIndex),
    })
  }

  // If no code blocks were found, treat the entire content as markdown
  if (sections.length === 0) {
    sections.push({ type: "markdown", content })
  }

  // Process Markdown in text sections
  const processedSections = []

  for (const section of sections) {
    if (section.type === "markdown") {
      // Process the markdown content
      const markdownParts = processMarkdown(section.content)
      processedSections.push(...markdownParts)
    } else {
      // Keep code blocks as is
      processedSections.push(section)
    }
  }

  return processedSections
}

// Function to process various Markdown elements
const processMarkdown = (content) => {
  if (!content) return []

  const parts = []
  const lines = content.split("\n")

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Check for headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      parts.push({
        type: "header",
        level: headerMatch[1].length,
        content: headerMatch[2],
      })
      i++
      continue
    }

    // Check for list items
    const listItemMatch = line.match(/^(-|\*|\d+\.)\s+(.+)$/)
    if (listItemMatch) {
      // Process the list item (which might contain inline code)
      parts.push({
        type: "listItem",
        marker: listItemMatch[1],
        content: listItemMatch[2],
      })
      i++
      continue
    }

    // Regular paragraph
    let paragraph = ""
    while (
      i < lines.length &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].match(/^(-|\*|\d+\.)\s+/) &&
      lines[i].trim() !== ""
    ) {
      paragraph += (paragraph ? "\n" : "") + lines[i]
      i++
    }

    // Skip empty lines
    if (paragraph.trim()) {
      parts.push({
        type: "paragraph",
        content: paragraph,
      })
    } else {
      i++ // Skip empty line
    }
  }

  // Process inline code within each part's content
  const processedParts = parts.map((part) => {
    if (
      part.type === "paragraph" ||
      part.type === "listItem" ||
      part.type === "header"
    ) {
      // Process inline code
      const inlineCodeRegex = /`([^`]+)`/g
      let content = part.content
      let inlineParts = []
      let lastIndex = 0
      let inlineMatch

      while ((inlineMatch = inlineCodeRegex.exec(content)) !== null) {
        // Add text before inline code
        if (inlineMatch.index > lastIndex) {
          inlineParts.push({
            type: "plaintext",
            content: content.substring(lastIndex, inlineMatch.index),
          })
        }

        // Add inline code
        inlineParts.push({
          type: "inlinecode",
          content: inlineMatch[1],
        })

        lastIndex = inlineMatch.index + inlineMatch[0].length
      }

      // Add remaining text
      if (lastIndex < content.length) {
        inlineParts.push({
          type: "plaintext",
          content: content.substring(lastIndex),
        })
      }

      if (inlineParts.length > 1) {
        return {
          ...part,
          hasInlineCode: true,
          inlineParts,
        }
      }
    }

    return part
  })

  return processedParts
}

export default function Home() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    { role: "system", content: "You are a helpful assistant." },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [formattedMessages, setFormattedMessages] = useState([])
  const [displayedText, setDisplayedText] = useState("")
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const seeded = useRef(false)
  useEffect(() => {
    if (!router.isReady || seeded.current) return // guard
    const { summarize, content } = router.query
    if (summarize && content) {
      seeded.current = true // mark as done
      try {
        const decoded = decodeURIComponent(content)
        setMessages([SYSTEM_PROMPT, { role: "user", content: decoded }])
        summarizeInitial(decoded)
      } catch (e) {
        console.error("Invalid URI component:", content)
      }
    }
  }, [router.isReady, router.query])

  useEffect(() => {
    const filtered = messages.filter((m) => m.role !== "system")
    const formatted = filtered.map((message) => ({
      ...message,
      formattedContent: formatMessage(message.content),
    }))
    setFormattedMessages(formatted)
  }, [messages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [formattedMessages, displayedText])

  const summarizeInitial = async (code) => {
    setLoading(true)
    try {
      const res = await fetch(
        "https://api.intelligence.io.solutions/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct",
            messages: [SYSTEM_PROMPT, { role: "user", content: code }],
            temperature: 0.7,
            max_completion_tokens: 200,
          }),
        }
      )

      const data = await res.json()
      const reply = data.choices?.[0]?.message
      if (reply) setMessages((prev) => [...prev, reply])
    } catch (e) {
      console.error("LLM request failed:", e)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const filteredMessages = messages.filter((m) => m.role !== "system")
    const newUserMessage = { role: "user", content: input }
    const finalMessages = [SYSTEM_PROMPT, ...filteredMessages, newUserMessage]

    setMessages([...messages, newUserMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(
        "https://api.intelligence.io.solutions/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct",
            messages: finalMessages,
            temperature: 0.7,
            max_completion_tokens: 200,
          }),
        }
      )

      if (!res.ok) {
        const text = await res.text()
        console.error("API returned error:", res.status, text)
        throw new Error("API error")
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message
      if (reply) {
        setMessages((prev) => [...prev, reply])
      }
    } catch (err) {
      console.error("sendMessage failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderInlineCode = (content) => {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gray-900 text-pink-400 font-mono text-sm">
        {content}
      </code>
    )
  }

  const renderTextWithInlineCode = (part) => {
    if (!part.hasInlineCode) {
      return <span>{part.content}</span>
    }

    return part.inlineParts.map((inlinePart, index) => {
      if (inlinePart.type === "inlinecode") {
        return <span key={index}>{renderInlineCode(inlinePart.content)}</span>
      }
      return <span key={index}>{inlinePart.content}</span>
    })
  }

  // Render a message part
  const renderMessagePart = (part, index) => {
    // Render code blocks
    if (part.type === "code") {
      return (
        <div key={`code-${index}`} className="my-2 rounded-md overflow-hidden">
          <div className="bg-gray-900 text-xs text-gray-400 px-4 py-1 flex justify-between items-center">
            <span>{part.language || "code"}</span>
            <button
              className="text-gray-400 hover:text-white"
              onClick={() => navigator.clipboard.writeText(part.content)}
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            language={part.language || "text"}
            style={atomDark}
            customStyle={{ margin: 0, borderRadius: "0 0 0.375rem 0.375rem" }}
            codeTagProps={{ style: { fontFamily: "monospace" } }}
          >
            {part.content}
          </SyntaxHighlighter>
        </div>
      )
    }

    // Render headers
    if (part.type === "header") {
      const HeaderTag = `h${part.level}`
      const headerClass = `text-${
        ["base", "xl", "lg", "md", "sm", "xs"][part.level - 1]
      } font-bold ${
        part.level <= 2 ? "border-b border-gray-600 pb-1 mb-2" : "my-1.5"
      }`

      return (
        <HeaderTag key={`header-${index}`} className={headerClass}>
          {part.hasInlineCode ? renderTextWithInlineCode(part) : part.content}
        </HeaderTag>
      )
    }

    // Render list items
    if (part.type === "listItem") {
      return (
        <div key={`list-${index}`} className="flex items-start space-x-2 my-1">
          <span className="text-gray-400">{part.marker}</span>
          <div className="flex-1">
            {part.hasInlineCode ? renderTextWithInlineCode(part) : part.content}
          </div>
        </div>
      )
    }

    // Render paragraphs
    if (part.type === "paragraph") {
      return (
        <p key={`para-${index}`} className="whitespace-pre-wrap my-2">
          {part.hasInlineCode ? renderTextWithInlineCode(part) : part.content}
        </p>
      )
    }

    // Fallback for any unhandled types
    return (
      <p key={`default-${index}`} className="whitespace-pre-wrap">
        {part.content}
      </p>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-gray-800 shadow-xl rounded-lg p-6 space-y-5 border border-gray-700">
        <div
          ref={containerRef}
          className="h-[600px] overflow-y-auto rounded p-4 space-y-5 bg-gray-800 scrollbar-thin scrollbar-thumb-gray-600"
        >
          {formattedMessages.map((message, i) => {
            const isLastAssistant =
              i === formattedMessages.length - 1 && message.role === "assistant"

            return (
              <div
                key={i}
                className={message.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={`inline-block text-left max-w-xs md:max-w-sm px-3 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  {message.formattedContent.map((part, j) =>
                    renderMessagePart(part, j)
                  )}
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="text-left text-gray-400">
              <span className="flex items-center">
                <span className="h-2 w-2 mr-1 rounded-full bg-gray-400 animate-pulse"></span>
                <span className="h-2 w-2 mx-1 rounded-full bg-gray-400 animate-pulse delay-75"></span>
                <span className="h-2 w-2 ml-1 rounded-full bg-gray-400 animate-pulse delay-150"></span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-600 rounded-lg px-3 py-2 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
            placeholder="Say something..."
          />
          <button
            onClick={sendMessage}
            className={`text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              loading || !input.trim()
                ? "bg-blue-500/50 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
