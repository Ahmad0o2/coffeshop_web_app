import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { connectSocket } from "../services/socketClient";

const fetchSettings = async () => {
  const { data } = await api.get("/settings");
  return data.settings;
};

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    const socket = connectSocket(socketUrl);
    const handler = (payload) => {
      if (payload?.settings) {
        queryClient.setQueryData(["settings"], payload.settings);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    };
    socket.on("settings:changed", handler);
    return () => {
      socket.off("settings:changed", handler);
    };
  }, [queryClient]);

  return query;
}
