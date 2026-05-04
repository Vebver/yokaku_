// TableReservationHooks.js
import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";

const API_BASE = "https://yokaku-backend.onrender.com/api";
const SOCKET_URL = "https://yokaku-backend.onrender.com";

export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (token && userId) {
      const newSocket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("Socket connected for reservation");
        newSocket.emit("join_user", userId);
      });

      setSocket(newSocket);

      return () => {
        if (newSocket) newSocket.close();
      };
    }
  }, []);

  return socket;
};

export const useAddressData = () => {
  const [addressData, setAddressData] = useState({
    municipalities: [],
    barangays: [],
  });

  useEffect(() => {
    axios
      .get(`${API_BASE}/address/municipalities`)
      .then((res) =>
        setAddressData((prev) => ({
          ...prev,
          municipalities: Array.isArray(res.data)
            ? res.data
            : res.data.data || [],
        })),
      )
      .catch(console.error);
  }, []);

  const fetchBarangays = async (muniCode) => {
    if (!muniCode) return;
    try {
      const res = await axios.get(`${API_BASE}/address/barangays/${muniCode}`);
      setAddressData((prev) => ({
        ...prev,
        barangays: Array.isArray(res.data) ? res.data : [],
      }));
    } catch (error) {
      console.error(error);
    }
  };

  return { addressData, fetchBarangays };
};

export const useActiveReservation = () => {
  const [hasActiveReservationBlock, setHasActiveReservationBlock] =
    useState(false);
  const [activeReservationDetails, setActiveReservationDetails] =
    useState(null);

  useEffect(() => {
    const checkExistingActiveReservation = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");

      if (!userId || userId === "null") {
        setHasActiveReservationBlock(false);
        return;
      }

      try {
        const res = await axios.get(
          `${API_BASE}/reservations/check-active/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.data.hasActive) {
          const activeRes = await axios.get(
            `${API_BASE}/reservations/user-active/${userId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setHasActiveReservationBlock(true);
          setActiveReservationDetails(activeRes.data);
        } else {
          setHasActiveReservationBlock(false);
          setActiveReservationDetails(null);
        }
      } catch (err) {
        console.error("Check active error:", err);
        setHasActiveReservationBlock(false);
      }
    };

    checkExistingActiveReservation();
  }, []);

  return { hasActiveReservationBlock, activeReservationDetails };
};
