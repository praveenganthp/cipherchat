import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { ChatInput } from "../chat/chat-input";

describe("ChatInput Component", () => {
  it("should render textarea and submit button", () => {
    const handleSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSendMessage={handleSend} />);

    const textarea = screen.getByRole("textbox", { name: /message/i });
    expect(textarea).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /send message/i });
    expect(submitBtn).toBeDefined();
  });

  it("should submit on Enter when not composing with IME", async () => {
    const handleSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSendMessage={handleSend} />);

    const textarea = screen.getByRole("textbox", { name: /message/i });
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Hello CipherChat" } });
    });

    await act(async () => {
      fireEvent.keyDown(textarea, {
        key: "Enter",
        shiftKey: false,
        isComposing: false,
      });
    });

    expect(handleSend).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Hello CipherChat",
      })
    );
  });

  it("should NOT submit on Enter when user is actively composing with an IME", async () => {
    const handleSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatInput onSendMessage={handleSend} />);

    const textarea = screen.getByRole("textbox", { name: /message/i });
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Konichiwa" } });
    });

    await act(async () => {
      fireEvent.keyDown(textarea, {
        key: "Enter",
        shiftKey: false,
        isComposing: true,
      });
    });

    expect(handleSend).not.toHaveBeenCalled();
  });
});
