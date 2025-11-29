// 📁 src/context/PlacesContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

// Context 생성
const PlacesContext = createContext();
export const usePlaces = () => useContext(PlacesContext);

export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState([]);

  // 🔥 저장된 장소 로드
  useEffect(() => {
    const saved = localStorage.getItem("savedPlaces");
    if (saved) setPlaces(JSON.parse(saved));
  }, []);

  // 🔥 저장될 때마다 localStorage 반영
  useEffect(() => {
    localStorage.setItem("savedPlaces", JSON.stringify(places));
  }, [places]);

  // 장소 추가
  const addPlace = (place) => setPlaces((prev) => [...prev, place]);

  // 삭제
  const deletePlace = (id) => setPlaces((prev) => prev.filter(p => p.id !== id));

  // 검색 기능 (searchBtn 연결)
  const searchPlaces = (keyword) =>
    places.filter(p => p.name.includes(keyword));

  return (
    <PlacesContext.Provider value={{ places, addPlace, deletePlace, searchPlaces }}>
      {children}
    </PlacesContext.Provider>
  );
}
