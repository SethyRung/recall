import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { getMessageCitations } from "../../app/utils/citations";

describe("getMessageCitations", () => {
  it("returns empty array for user messages", () => {
    const message: UIMessage = {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "Hello!" }],
    };
    expect(getMessageCitations(message)).toEqual([]);
  });

  it("returns empty array for assistant greetings without tool invocations", () => {
    const message: UIMessage = {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "Hi! How can I help you today?" }],
    };
    expect(getMessageCitations(message)).toEqual([]);
  });

  it("extracts document titles from tool execution results", () => {
    const message: UIMessage = {
      id: "3",
      role: "assistant",
      parts: [
        {
          type: "tool-Get Information" as any,
          toolInvocation: {
            toolName: "Get Information",
            state: "result",
            result: [
              { id: "c1", documentTitle: "About Sethy", content: "..." },
              { id: "c2", documentTitle: "Projects", content: "..." },
              { id: "c3", documentTitle: "About Sethy", content: "..." },
            ],
          } as any,
        },
        { type: "text", text: "Sethy is a developer with multiple projects." },
      ],
    };
    expect(getMessageCitations(message)).toEqual(["About Sethy", "Projects"]);
  });

  it("extracts document titles from native source-document parts", () => {
    const message: UIMessage = {
      id: "4",
      role: "assistant",
      parts: [
        {
          type: "source-document",
          sourceId: "s1",
          mediaType: "text/markdown",
          title: "Experience",
        } as any,
        { type: "text", text: "Sethy has extensive engineering experience." },
      ],
    };
    expect(getMessageCitations(message)).toEqual(["Experience"]);
  });
});
