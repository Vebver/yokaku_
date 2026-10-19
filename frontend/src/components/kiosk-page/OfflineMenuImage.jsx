import React, { useEffect, useState } from "react";

const DATABASE_NAME = "resting-kiosk-assets";
const STORE_NAME = "images";
let databasePromise;

const openDatabase = () => {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
};

const readImage = async (source) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(source);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const writeImage = async (source, blob) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(blob, source);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
};

const isExternalImage = (source) => {
  try {
    return new URL(source, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

const OfflineMenuImage = ({ src, ...imageProps }) => {
  const [displaySource, setDisplaySource] = useState(src);

  useEffect(() => {
    let isActive = true;
    let objectUrl = null;
    setDisplaySource(src);

    if (!src || !isExternalImage(src) || !("indexedDB" in window)) {
      return () => {
        isActive = false;
      };
    }

    const loadLocalCopy = async () => {
      try {
        const cachedBlob = await readImage(src);
        if (cachedBlob) {
          objectUrl = URL.createObjectURL(cachedBlob);
          if (isActive) setDisplaySource(objectUrl);
          return;
        }

        if (!navigator.onLine) return;
        const response = await fetch(src, { mode: "cors", cache: "force-cache" });
        if (!response.ok) return;
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) return;
        await writeImage(src, blob);
        objectUrl = URL.createObjectURL(blob);
        if (isActive) setDisplaySource(objectUrl);
      } catch {
        // Keep the original image URL as the online fallback.
      }
    };

    loadLocalCopy();
    return () => {
      isActive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return <img {...imageProps} src={displaySource} />;
};

export default OfflineMenuImage;