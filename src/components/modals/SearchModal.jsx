// src/components/modals/SearchModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

function SearchModal({ isOpen, onClose, userPlaces, deletePlace, mapRef, currentRadiusCircleRef, currentNameOverlayRef }) {
  const [keyword, setKeyword] = useState(''); // 검색어 상태
  const [searchResults, setSearchResults] = useState([]); // 검색 결과 상태
  const keywordInputRef = useRef(null); // 검색 input 요소를 참조하기 위한 ref

  // 장소 목록을 현재 검색어에 따라 필터링하는 함수
  const performSearch = useCallback((currentKeyword) => {
    if (!currentKeyword.trim()) { // 검색어가 비어있으면 결과 초기화
      setSearchResults([]);
      return;
    }

    const results = userPlaces.filter(
      (place) =>
        place.name.includes(currentKeyword) || // 대소문자 구분
        place.name.toLowerCase().includes(currentKeyword.toLowerCase()) // 대소문자 무시
    );
    setSearchResults(results); // 검색 결과 업데이트
  }, [userPlaces]); // userPlaces가 변경될 때만 함수를 재생성

  // useEffect: 모달이 열리거나 닫힐 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setKeyword('');       // 모달 열릴 때 검색어 초기화
      setSearchResults([]); // 검색 결과 초기화
      if (keywordInputRef.current) {
        keywordInputRef.current.focus(); // 모달 열리면 바로 input에 포커스
      }
    } else {
      // 모달 닫힐 때도 상태 초기화 (혹시 모를 잔여 데이터 방지)
      setKeyword('');
      setSearchResults([]);
    }
  }, [isOpen]); // isOpen 상태가 변경될 때마다 실행

  // useEffect: keyword가 변경될 때마다 자동 검색 실행
  useEffect(() => {
    if (isOpen) { // 모달이 열려있을 때만 검색 실행
      performSearch(keyword);
    }
  }, [keyword, isOpen, performSearch]); // keyword, isOpen, performSearch가 변경될 때마다 실행

  // 검색어 입력 변경 핸들러 (이제 여기서 바로 검색이 트리거됩니다)
  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);
    // 💡 performSearch(e.target.value)를 직접 호출하지 않아도
    //    위의 useEffect([keyword])가 변경을 감지하고 performSearch를 호출합니다.
  };

  // 검색 결과 아이템 클릭 핸들러 (지도로 이동 및 반경/이름 오버레이 표시)
  const handleResultClick = (placeId) => {
    const foundPlace = userPlaces.find((place) => place.id === placeId);
    // window.kakao.maps 안전성 강화 (index.html에서 로드된 전역 객체임을 명시)
    if (!foundPlace || !mapRef.current || !window.kakao || !window.kakao.maps) return;

    const latlng = new window.kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
    mapRef.current.setCenter(latlng);
    mapRef.current.setLevel(3);

    // 이전 반경 원 제거
    if (currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setMap(null);
      currentRadiusCircleRef.current = null;
    }
    // 새 반경 원 생성 및 지도에 표시
    currentRadiusCircleRef.current = new window.kakao.maps.Circle({
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
    currentNameOverlayRef.current = new window.kakao.maps.CustomOverlay({
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

  // 검색 결과 아이템 삭제 버튼 클릭 핸들러
  const handleDeleteButtonClick = (event, placeId) => {
    event.stopPropagation(); // 버블링 중단! (장소 삭제 후 모달이 닫히는 현상 방지)
    deletePlace(placeId); // App.jsx에서 받은 deletePlace 함수 호출
    // userPlaces가 업데이트되면 위의 performSearch `useEffect`가 감지하고 자동으로 검색 결과를 갱신
  };

  // 모달 외부 클릭 시 닫기
  const handleModalOverlayClick = (event) => {
    // 💡 모달 오버레이 자체를 클릭했을 때만 닫히도록 id 확인
    if (event.target.id === 'searchModal') {
      onClose(); // App.jsx의 onClose 함수 호출
    }
  };

  // isOpen 상태가 false면 아무것도 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div
      id="searchModal"
      className="placeModal" // CSS 호환성을 위해 기존 placeModal 클래스 사용 (필요시 'searchModal' 클래스로 분리)
      style={{ display: 'flex' }} // isOpen 상태가 false면 null을 반환하므로 여기선 항상 'flex'
      onClick={handleModalOverlayClick}
    >
      <div className="modal-content">
        <h2>장소 검색</h2>
        <div className="search-modal-container">
          <input
            type="text"
            id="keyword"
            placeholder="어디로 가고싶나요?"
            autoComplete="off"
            value={keyword}
            onChange={handleKeywordChange} // 💡 글자 입력 시마다 검색 트리거
            ref={keywordInputRef} // input 요소에 ref 연결
          />
          <button id="searchBtn" onClick={() => performSearch(keyword)}>
            검색
          </button>
        </div>
        <ul id="searchResultsList">
          {searchResults.length === 0 ? (
            <li id="no-search-results">
              {keyword.trim() ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '아무것도 없어요!'}
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