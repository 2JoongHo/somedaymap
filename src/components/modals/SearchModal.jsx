// src/components/modals/SearchModal.jsx
import React, { useState, useRef } from 'react';

// App.jsx로부터 필요한 props를 받는다.
// isOpen: 모달의 열림/닫힘 상태 (boolean)
// onClose: 모달을 닫는 함수
// userPlaces: 사용자의 장소 목록 (Array)
// deletePlace: 장소를 삭제하는 함수
// mapRef, currentRadiusCircleRef, currentNameOverlayRef: 지도 객체들에 대한 ref (장소 클릭 시 지도 제어용)
function SearchModal({ isOpen, onClose, userPlaces, deletePlace, mapRef, currentRadiusCircleRef, currentNameOverlayRef }) {
  const [keyword, setKeyword] = useState(''); // 검색어 상태
  const [searchResults, setSearchResults] = useState([]); // 검색 결과 상태
  const keywordInputRef = useRef(null); // 검색 input 요소를 참조하기 위한 ref

  // ⭐️ 검색 버튼 클릭 핸들러 ⭐️
  const handleSearch = () => {
    if (!keyword.trim()) {
      setSearchResults([]); // 검색어 없으면 결과 초기화
      return;
    }

    const results = userPlaces.filter(
      (place) =>
        place.name.includes(keyword) ||
        place.name.toLowerCase().includes(keyword.toLowerCase())
    );
    setSearchResults(results); // 검색 결과 업데이트
  };

  // ⭐️ 검색어 입력 변경 핸들러 ⭐️
  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);
  };

  // ⭐️ 검색 결과 아이템 클릭 핸들러 (지도로 이동 및 반경/이름 오버레이 표시) ⭐️
  const handleResultClick = (placeId) => {
    const foundPlace = userPlaces.find((place) => place.id === placeId);
    if (!foundPlace || !mapRef.current) return;

    const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
    mapRef.current.setCenter(latlng);
    mapRef.current.setLevel(3);

    // 이전 반경 원 제거
    if (currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setMap(null);
      currentRadiusCircleRef.current = null;
    }
    // 새 반경 원 생성 및 지도에 표시
    currentRadiusCircleRef.current = new kakao.maps.Circle({
      map: mapRef.current,
      center: latlng,
      radius: foundPlace.radius,
      strokeWeight: 2,
      strokeColor: '#007BFF',
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
      fillColor: '#007BFF',
      fillOpacity: 0.2,
    });

    // 이전 이름 오버레이 제거
    if (currentNameOverlayRef.current) {
      currentNameOverlayRef.current.setMap(null);
      currentNameOverlayRef.current = null;
    }
    // 새 이름 오버레이 생성
    currentNameOverlayRef.current = new kakao.maps.CustomOverlay({
      map: mapRef.current,
      position: latlng,
      content: `<div class="marker-name-overlay">${foundPlace.name}</div>`,
      yAnchor: 2.2,
      zIndex: 3,
    });
    currentNameOverlayRef.current.setMap(mapRef.current);

    console.log(`[SearchModal] '${foundPlace.name}'(으)로 지도 이동 및 반경/이름 오버레이 표시.`);
    onClose(); // 장소 클릭 후 모달 닫기
  };

  // ⭐️ 검색 결과 아이템 삭제 버튼 클릭 핸들러 ⭐️
  const handleDeleteButtonClick = (event, placeId) => {
    event.stopPropagation(); // 버블링 중단! (모달이 닫히는 현상 방지)
    deletePlace(placeId); // App.jsx에서 받은 deletePlace 함수 호출
    // 삭제 후 검색 결과도 업데이트 (App.js의 userPlaces가 업데이트되면 이 모달도 리렌더링됨)
    handleSearch(); // 현재 검색어로 다시 검색하여 결과를 갱신
  };

  // ⭐️ 모달 외부 클릭 시 닫기 ⭐️
  const handleModalOverlayClick = (event) => {
    if (event.target.id === 'searchModal') {
      onClose(); // App.jsx의 onClose 함수 호출
    }
  };

  // isOpen 상태에 따라 모달을 표시하거나 숨긴다.
  if (!isOpen) return null;

  return (
    <div
      id="searchModal"
      className="placeModal" // CSS 호환성을 위해 기존 placeModal 클래스 사용
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={handleModalOverlayClick}
    >
      <div className="modal-content">
        <h2>장소 검색</h2>
        <div className="search-modal-container">
          <input
            type="text"
            id="keyword"
            placeholder="장소 이름을 검색하세요..."
            autoComplete="off"
            value={keyword}
            onChange={handleKeywordChange}
            onKeyPress={(e) => { // Enter 키 입력 시 검색
              if (e.key === 'Enter') handleSearch();
            }}
            ref={keywordInputRef} // input 요소에 ref 연결
          />
          <button id="searchBtn" onClick={handleSearch}>
            검색
          </button>
        </div>
        <ul id="searchResultsList">
          {searchResults.length === 0 ? (
            <li id="no-search-results">
              {keyword.trim() ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '검색어를 입력해주세요.'}
            </li>
          ) : (
            searchResults.map((place) => (
              <li key={place.id} data-id={place.id} onClick={() => handleResultClick(place.id)}>
                <span className="search-result-name">{place.name}</span>
                <button
                  className="delete-place-btn"
                  data-id={place.id}
                  onClick={(e) => handleDeleteButtonClick(e, place.id)}
                >
                  삭제
                </button>
              </li>
            ))
          )}
        </ul>
        <button id="closeSearchModal" className="modal-close-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

export default SearchModal;