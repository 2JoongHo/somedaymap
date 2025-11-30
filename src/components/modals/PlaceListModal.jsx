// src/components/modals/PlaceListModal.jsx
import React, { useEffect, useRef } from 'react';

// App.jsx로부터 필요한 props를 받는다.
// isOpen: 모달의 열림/닫힘 상태 (boolean)
// onClose: 모달을 닫는 함수
// userPlaces: 사용자의 장소 목록 (Array)
// deletePlace: 장소를 삭제하는 함수
// mapRef, currentRadiusCircleRef, currentNameOverlayRef: 지도 객체들에 대한 ref (장소 클릭 시 지도 제어용)
function PlaceListModal({ isOpen, onClose, userPlaces, deletePlace, mapRef, currentRadiusCircleRef, currentNameOverlayRef }) {
  const modalContentRef = useRef(null); // 모달 콘텐츠 내부를 참조하기 위한 ref

  // ⭐️ 장소 클릭 핸들러 (지도로 이동 및 반경/이름 오버레이 표시) ⭐️
  const handlePlaceClick = (placeId) => {
    // App.jsx의 MapContainer에서 정의된 handlePlaceClick 로직을 재사용해야 함.
    // 하지만 MapContainer의 handlePlaceClick은 MapContainer 내부의 Ref를 직접 사용하므로
    // App.jsx에서 handlePlaceClick 함수 자체를 props로 전달받는 것이 가장 깔끔하다.
    // 현재 App.jsx에서 handlePlaceClick을 MapContainer의 prop으로 전달하고 있지 않으니
    // 이곳에서는 MapContainer의 메서드를 호출하는 대신, 직접 로직을 작성해야 한다.
    // 만약 App.jsx에서 handlePlaceClick 함수를 prop으로 전달해준다면
    // 다음과 같이 호출 가능: onPlaceItemClick(placeId); (onPlaceItemClick은 App에서 MapContainer의 handlePlaceClick을 감싸는 함수)

    const foundPlace = userPlaces.find(place => place.id === placeId);
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
      strokeWeight: 2, strokeColor: '#007BFF', strokeOpacity: 0.8,
      strokeStyle: 'solid', fillColor: '#007BFF', fillOpacity: 0.2
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
      yAnchor: 2.2, zIndex: 3
    });
    currentNameOverlayRef.current.setMap(mapRef.current);

    console.log(`[PlaceListModal] '${foundPlace.name}'(으)로 지도 이동 및 반경/이름 오버레이 표시.`);
    onClose(); // 장소 클릭 후 모달 닫기
  };

  // ⭐️ 삭제 버튼 클릭 핸들러 ⭐️
  const handleDeleteButtonClick = (event, placeId) => {
    event.stopPropagation(); // 버블링 중단! (모달이 닫히는 현상 방지)
    deletePlace(placeId); // App.jsx에서 받은 deletePlace 함수 호출
  };

  // 모달 외부 클릭 시 닫기 (모달 컨테이너 자체가 클릭되었을 때)
  const handleModalOverlayClick = (event) => {
    if (event.target.id === 'placeModal') { // 배경 클릭 시
      onClose(); // App.jsx의 onClose 함수 호출
    }
  };

  // isOpen 상태에 따라 모달을 표시하거나 숨긴다.
  if (!isOpen) return null;

  return (
    <div id="placeModal" className="placeModal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={handleModalOverlayClick}>
      <div className="modal-content" ref={modalContentRef}>
        <h2>내 장소 목록</h2>
        <ul id="placeList">
          {userPlaces.length === 0 ? (
            <li id="no-places-message">언젠가 가보고 싶은 곳을 찍어보세요!</li>
          ) : (
            userPlaces.map((place) => (
              <li key={place.id} data-id={place.id} onClick={() => handlePlaceClick(place.id)}>
                <span className="place-list-name">{place.name}</span>
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
        <button id="closeModal" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

export default PlaceListModal;