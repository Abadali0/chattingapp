import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UserSidebar from "./UserSidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ChatRoom({ user, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([user.username]);
  const [connectionError, setConnectionError] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/messages/${encodeURIComponent(user.groupName)}`
        );

        if (active) {
          setMessages(response.data);
        }
      } catch (error) {
        console.error("Could not load messages:", error);
      }
    };

    loadMessages();

    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionError("");
      socket.emit("joinGroup", {
        username: user.username,
        groupName: user.groupName,
      });
    });

    socket.on("connect_error", () => {
      setConnectionError("Server connection failed. Start the backend server.");
    });

    socket.on("roomUsers", (roomUsers) => {
      setUsers(roomUsers);
    });

    socket.on("newMessage", (message) => {
      setMessages((previous) => {
        if (previous.some((item) => item._id === message._id)) {
          return previous;
        }
        return [...previous, message];
      });
    });

    return () => {
      active = false;
      socket.emit("leaveGroup");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const sendMessage = (text) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      setConnectionError("You are not connected to the chat server.");
      return;
    }

    socket.emit("sendMessage", {
      text,
    });
  };

  const handleLeave = () => {
    socketRef.current?.emit("leaveGroup");
    socketRef.current?.disconnect();
    onLeave();
  };

  return (
    <div className="chat-page">
      <UserSidebar
        users={users}
        currentUser={user.username}
        onLeave={handleLeave}
      />

      <div className="chat-main">
        <ChatHeader
          groupName={user.groupName}
          usersCount={users.length}
        />

        {connectionError && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(239,68,68,.12)",
              color: "#fca5a5",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            {connectionError}
          </div>
        )}

        <MessageList
          messages={messages}
          currentUser={user.username}
        />

        <MessageInput onSend={sendMessage} />
      </div>
    </div>
  );
}

export default ChatRoom;
