// 📁 src/components/SearchModal.jsx
import { useState } from "react";
import { usePlaces } from "../context/PlacesContext";

export default function SearchModal({ open, onClose }) {
  const { searchPlaces } = usePlaces();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);

  if (!open) return null;

  // 🔍 검색 실행
  const handleSearch = () => {
    const found = searchPlaces(keyword);
    setResults(found);
  };

  return (
    <div id="searchModal" className="placeModal">
      <div className="modal-content">
        <h2>장소 검색</h2>

        <div className="search-modal-container">
          <input
            type="text"
            id="keyword"
            placeholder="저장된 장소 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button id="searchBtn" onClick={handleSearch}>검색</button>
        </div>

        <ul id="searchResultsList">
          {results.length === 0 ? (
            <li id="no-search-results">검색 결과 없음</li>
          ) : (
            results.map(r => (
              <li key={r.id} onClick={() => alert(`📍 위치 이동 기능 추가 가능 — ${r.name}`)}>
                <span>{r.name}</span>
              </li>
            ))
          )}
        </ul>

        <button id="closeSearchModal" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
