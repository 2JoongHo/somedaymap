// src/components/modals/RecommendationModal.jsx
import React from 'react';
import { useRef, useEffect } from 'react'; // useRef와 useEffect 임포트

function RecommendationModal({ isOpen, onClose, recommendedGroups, mapRef, currentRadiusCircleRef, currentNameOverlayRef }) {
  const modalContentRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalContentRef.current) {
      modalContentRef.current.focus(); // 모달이 열리면 포커스
    }
  }, [isOpen]);

  const handleGroupClick = (group) => {
    if (!mapRef.current || !window.kakao || !window.kakao.maps) return;

    // 지도 중심을 그룹의 첫 번째 장소로 이동
    const firstPlace = group[0];
    const latlng = new window.kakao.maps.LatLng(firstPlace.lat, firstPlace.lng);
    mapRef.current.setCenter(latlng);
    mapRef.current.setLevel(3); // 적절한 줌 레벨 (그룹 전체가 보이도록)

    // 이전에 표시된 반경 원과 이름 오버레이 제거
    if (currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setMap(null);
      currentRadiusCircleRef.current = null;
    }
    if (currentNameOverlayRef.current) {
      currentNameOverlayRef.current.setMap(null);
      currentNameOverlayRef.current = null;
    }

    // 그룹 내 각 장소에 마커 및 반경/이름 오버레이 표시
    group.forEach(place => {
      const pLatLng = new window.kakao.maps.LatLng(place.lat, place.lng);
      
      // 마커는 MapContainer에서 관리하는 클러스터러가 알아서 할 것이므로 별도로 추가하지 않고,
      // 반경원과 이름 오버레이만 지도에 직접 표시
      new window.kakao.maps.Circle({
        map: mapRef.current,
        center: pLatLng,
        radius: place.radius,
        strokeWeight: 2, strokeColor: '#FF0000', strokeOpacity: 0.8, // 💡 그룹용 다른 색상
        strokeStyle: 'solid', fillColor: '#FF0000', fillOpacity: 0.2
      }).setMap(mapRef.current);

      new window.kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: pLatLng,
        content: `<div class="marker-name-overlay recommendation-overlay">${place.name}</div>`, // 💡 추천 그룹용 클래스 추가
        yAnchor: 2.2, zIndex: 5 // zIndex를 높여 다른 오버레이와 겹치지 않도록
      }).setMap(mapRef.current);
    });

    onClose(); // 클릭 후 모달 닫기
  };

  if (!isOpen) return null;

  return (
    <div id="recommendationModal" className="placeModal" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content recommendation-content" ref={modalContentRef} onClick={e => e.stopPropagation()}>
        <h2>추천 장소 그룹</h2>
        {recommendedGroups.length === 0 ? (
          <p>서로 1km 이내에 있는 장소 그룹을 찾을 수 없습니다.</p>
        ) : (
          <ul id="recommendedGroupsList">
            {recommendedGroups.map((group, groupIndex) => (
              <li key={groupIndex} className="recommendation-group-item">
                <h3>그룹 #{groupIndex + 1}</h3>
                <ul>
                  {group.map((place) => (
                    <li key={place.id} onClick={() => handleGroupClick(group)}>
                      <span className="recommendation-place-name">{place.name}</span>
                      <span className="recommendation-place-details">({place.lat.toFixed(4)}, {place.lng.toFixed(4)})</span>
                    </li>
                  ))}
                </ul>
                <button className="view-group-on-map-btn" onClick={() => handleGroupClick(group)}>지도에서 보기</button>
              </li>
            ))}
          </ul>
        )}
        <button className="modal-close-btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

export default RecommendationModal;