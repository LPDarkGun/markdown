import React, { useState } from "react"
import { FaFolder, FaFolderOpen, FaFileAlt } from "react-icons/fa"
import { motion } from "framer-motion"
import * as Icons from "react-icons/fa"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Toaster } from "@/components/ui/toaster"

const excludedFolders = [
  "node_modules",
  ".git",
  ".DS_Store",
  "dist",
  "build",
  "coverage",
  ".gitignore",
  ".next",
]

const getFileIcon = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase()

  const extensionIconMap = {
    js: <Icons.FaJs className="text-yellow-400" />,
    jsx: <Icons.FaReact className="text-blue-400" />,
    ts: <Icons.FaFileCode className="text-blue-400" />,
    tsx: <Icons.FaReact className="text-blue-400" />,
    html: <Icons.FaHtml5 className="text-orange-400" />,
    css: <Icons.FaCss3Alt className="text-blue-400" />,
    scss: <Icons.FaSass className="text-pink-400" />,
    json: <Icons.FaFileCode className="text-yellow-400" />,
    md: <Icons.FaMarkdown className="text-gray-400" />,
    txt: <Icons.FaFileAlt className="text-gray-400" />,
    png: <Icons.FaFileImage className="text-green-400" />,
    jpg: <Icons.FaFileImage className="text-green-400" />,
    jpeg: <Icons.FaFileImage className="text-green-400" />,
    gif: <Icons.FaFileImage className="text-green-400" />,
    svg: <Icons.FaFileImage className="text-green-400" />,
    pdf: <Icons.FaFilePdf className="text-red-400" />,
    doc: <Icons.FaFileWord className="text-blue-400" />,
    docx: <Icons.FaFileWord className="text-blue-400" />,
    xls: <Icons.FaFileExcel className="text-green-400" />,
    xlsx: <Icons.FaFileExcel className="text-green-400" />,
    ppt: <Icons.FaFilePowerpoint className="text-red-400" />,
    pptx: <Icons.FaFilePowerpoint className="text-red-400" />,
    zip: <Icons.FaFileArchive className="text-yellow-400" />,
    rar: <Icons.FaFileArchive className="text-yellow-400" />,
    exe: <Icons.FaFileCode className="text-gray-400" />,
    dll: <Icons.FaFileCode className="text-gray-400" />,
    iso: <Icons.FaFile className="text-gray-400" />,
    mp3: <Icons.FaFileAudio className="text-purple-400" />,
    mp4: <Icons.FaFileVideo className="text-purple-400" />,
    wav: <Icons.FaFileAudio className="text-purple-400" />,
    avi: <Icons.FaFileVideo className="text-purple-400" />,
    mov: <Icons.FaFileVideo className="text-purple-400" />,
    wmv: <Icons.FaFileVideo className="text-purple-400" />,
    asm: <Icons.FaFileCode className="text-green-400" />,
  }

  return extensionIconMap[extension] || <FaFileAlt className="text-gray-400" />
}

const getTextFileIcon = (extension) => {
  const extensionIconMap = {
    js: "📄",
    jsx: "📄",
    ts: "📄",
    tsx: "📄",
    html: "📄",
    css: "📄",
    scss: "📄",
    json: "📄",
    md: "📄",
    txt: "📄",
    png: "🖼️",
    jpg: "🖼️",
    jpeg: "🖼️",
    gif: "🖼️",
    svg: "🖼️",
    pdf: "📄",
    // Add more extensions as needed
  }

  return extensionIconMap[extension] || "📄"
}

const generateMarkdown = (node, prefix = "") => {
  let markdown = ""
  const connector = prefix === "" ? "" : prefix.slice(0, -4) + "└── "
  if (node.type === "folder") {
    markdown += `${connector}📁 ${node.name}\n`
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1
      const newPrefix = prefix + (isLast ? "    " : "│   ")
      markdown += generateMarkdown(child, newPrefix)
    })
  } else {
    const extension = node.name.split(".").pop().toLowerCase()
    const icon = getTextFileIcon(extension)
    markdown += `${connector}${icon} ${node.name}\n`
  }
  return markdown
}

const TreeNode = ({ node, onFileClick }) => {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  const handleToggle = () => {
    if (node.type === "folder") {
      setIsOpen(!isOpen)
    } else if (node.type === "file") {
      onFileClick(node)
    }
  }

  return (
    <div className="ml-4">
      <div className="flex items-center cursor-pointer" onClick={handleToggle}>
        {node.type === "folder" ? (
          <>
            {isOpen ? (
              <FaFolderOpen className="text-blue-300" />
            ) : (
              <FaFolder className="text-blue-300" />
            )}
            <span className="ml-2">{node.name}</span>
          </>
        ) : (
          <>
            {getFileIcon(node.name)}
            <span className="ml-2">{node.name}</span>
          </>
        )}
      </div>
      {hasChildren && (
        <motion.div
          initial={false}
          animate={isOpen ? "open" : "collapsed"}
          variants={{
            open: { opacity: 1, height: "auto", transition: { duration: 0.2 } },
            collapsed: { opacity: 0, height: 0, transition: { duration: 0.2 } },
          }}
          style={{ overflow: "hidden" }}
        >
          {node.children.map((child, index) => (
            <TreeNode node={child} key={index} onFileClick={onFileClick} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

const FolderTree = () => {
  const [folderStructure, setFolderStructure] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState("")
  const [fileType, setFileType] = useState("")
  const [markdownContent, setMarkdownContent] = useState("")
  const [rootFolderName, setRootFolderName] = useState("")

  const { toast } = useToast()

  const handleFolderUpload = async (event) => {
    const files = event.target.files
    const fileArray = Array.from(files)

    if (files.length > 0) {
      const firstFilePathParts = files[0].webkitRelativePath.split("/")
      const rootName = firstFilePathParts[0]
      setRootFolderName(rootName)
    }

    const folderTree = buildFolderTree(fileArray)
    setFolderStructure(folderTree)

    const markdown = generateMarkdown(folderTree)
    setMarkdownContent(markdown)
  }

  const buildFolderTree = (files) => {
    const root = {
      name: rootFolderName || "Root",
      type: "folder",
      children: [],
    }

    files.forEach((file) => {
      const pathParts = file.webkitRelativePath.split("/").filter(Boolean)

      // Exclude specified folders
      if (pathParts.some((part) => excludedFolders.includes(part))) {
        return // Skip this file or folder
      }

      let current = root

      for (let i = 1; i < pathParts.length; i++) {
        const part = pathParts[i]
        let existing = current.children.find((child) => child.name === part)

        const isFile = i === pathParts.length - 1 && part.includes(".")

        if (!existing) {
          existing = {
            name: part,
            type: isFile ? "file" : "folder",
            children: [],
            file: isFile ? file : null,
          }
          current.children.push(existing)
        }

        current = existing
      }
    })

    return root
  }

  const handleFileClick = (node) => {
    if (node.file) {
      const extension = node.name.split(".").pop().toLowerCase()
      setSelectedFile(node.name)
      setFileType(extension)

      if (["png", "jpg", "jpeg", "gif", "svg"].includes(extension)) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFileContent(e.target.result)
        }
        reader.readAsDataURL(node.file)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFileContent(e.target.result)
        }
        reader.readAsText(node.file)
      }
    }
  }

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent)
    toast({
      title: "Markdown copied!",
      description: "The folder structure has been copied to your clipboard.",
      status: "success",
      duration: 5000,
    })
  }

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-800 text-white">
        <div className="md:w-1/2 p-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <Label
                htmlFor="folder-upload"
                className="block mb-2 text-lg font-medium"
              >
                Upload a Folder:
              </Label>
              <Input
                id="folder-upload"
                type="file"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={handleFolderUpload}
                className="block w-full text-gray-300 bg-gray-700 border border-gray-600 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </motion.div>
          {folderStructure && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{rootFolderName}</h2>
                <Button onClick={copyMarkdown}>Copy Markdown</Button>
              </div>
              <ScrollArea className="h-[80vh]">
                <TreeNode
                  node={folderStructure}
                  onFileClick={handleFileClick}
                />
              </ScrollArea>
            </motion.div>
          )}
        </div>
        <div className="md:w-1/2 p-4">
          {selectedFile ? (
            <motion.div
              key={selectedFile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl mb-4">{selectedFile}</h2>
              <div className="bg-gray-700 p-4 rounded-md overflow-auto max-h-[90vh] text-sm">
                {["png", "jpg", "jpeg", "gif", "svg"].includes(fileType) ? (
                  <img
                    src={fileContent}
                    alt={selectedFile}
                    className="max-w-full"
                  />
                ) : (
                  <SyntaxHighlighter
                    language={fileType || "text"}
                    style={dracula}
                    showLineNumbers
                    wrapLines
                    customStyle={{ backgroundColor: "#2d2d2d" }}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-gray-400"
            >
              Select a file to view its content.
            </motion.div>
          )}
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default FolderTree
