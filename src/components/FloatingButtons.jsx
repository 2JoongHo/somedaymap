// src/components/FloatingButtons.jsx
import React, { useRef } from 'react';

// App.jsx로부터 필요한 props를 받는다.
// mapRef: MapContainer에서 생성된 kakao.maps.Map 인스턴스를 참조하는 ref
// myLocationOverlayRef: 내 위치 CustomOverlay를 참조하는 ref
function FloatingButtons({ mapRef, myLocationOverlayRef, closeAllModals }) {
  // 로딩 메시지를 위한 ref (이 컴포넌트 내부에서만 사용되므로 여기에 선언)
  const loadingMessageRef = useRef(null);

  // ⭐️ '내 위치로 이동' 버튼 클릭 핸들러 ⭐️
  const handleMoveToCurrentLocation = () => {
    // 다른 열려있는 UI 요소들을 모두 닫는다.
    closeAllModals(); 

    if (navigator.geolocation) {
      console.log('FloatingButtons: 내 위치로 이동 버튼 클릭됨: Geolocation API 호출 시작.');

      // 로딩 메시지 표시
      if (loadingMessageRef.current) {
        loadingMessageRef.current.style.display = 'block';
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 로딩 메시지 숨김
          if (loadingMessageRef.current) {
            loadingMessageRef.current.style.display = 'none';
          }

          console.log('✅ FloatingButtons: getCurrentPosition 성공 콜백 실행!');
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const userPosition = new kakao.maps.LatLng(lat, lng); // kakao 전역 객체 사용

          // mapRef.current를 통해 MapContainer의 지도 인스턴스에 접근
          if (mapRef.current) {
            mapRef.current.setCenter(userPosition); // 지도를 현재 위치로 이동
            mapRef.current.setLevel(3);           // 확대 레벨 조정
            console.log('FloatingButtons: 지도 현재 위치로 이동 완료:', lat, lng);

            // 내 위치 CustomOverlay 업데이트 또는 생성
            if (myLocationOverlayRef.current) {
              myLocationOverlayRef.current.setPosition(userPosition);
            } else {
              myLocationOverlayRef.current = new kakao.maps.CustomOverlay({
                map: mapRef.current, // MapContainer의 지도 인스턴스에 오버레이
                position: userPosition,
                content: '<div class="my-location-dot"></div>',
                zIndex: 100,
              });
            }
          }
        },
        (error) => {
          // 로딩 메시지 숨김
          if (loadingMessageRef.current) {
            loadingMessageRef.current.style.display = 'none';
          }

          console.log('❌ FloatingButtons: getCurrentPosition 실패 콜백 실행!', error);
          let errorMessage = "내 위치를 가져올 수 없습니다. 브라우저/기기 위치 설정 및 권한을 확인해주세요.";
          switch (error.code) {
            case error.PERMISSION_DENIED: errorMessage = "사용자가 위치 정보 접근을 허용하지 않았습니다. 브라우저 상단의 팝업 또는 기기 설정을 확인해주세요."; break;
            case error.POSITION_UNAVAILABLE: errorMessage = "위치 정보를 사용할 수 없습니다. (GPS 신호 불량, Wi-Fi 불안정 등)"; break;
            case error.TIMEOUT: errorMessage = "위치 정보를 가져오는 요청이 시간 초과되었습니다."; break;
            default: console.error('❌ FloatingButtons: 위치 정보 오류: 알 수 없는 오류', error); break;
          }
          alert(errorMessage);
          console.error('FloatingButtons: 내 위치로 이동 실패:', error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
      console.warn('⚠️ FloatingButtons: 이 브라우저는 Geolocation을 지원하지 않습니다.');
    }
  };

  return (
    <>
      <button 
        id="moveToCurrentLocationBtn" 
        className="my-location-btn" 
        onClick={handleMoveToCurrentLocation}
      >
        {/* 이미지 경로 조정 */}
        {/* <img src="/assets/icon/locationIcon.svg" alt="내 위치로 이동" /> */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg> {/* 임시 SVG 아이콘 */}
      </button>

      {/* 로딩 메시지 DOM (일반적으로는 Global UI Context나 Portal을 통해 관리) */}
      {/* 여기서는 단순화를 위해 이 컴포넌트에 포함 */}
      <div 
        ref={loadingMessageRef} 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 10000,
          display: 'none', // 초기에는 숨김
        }}
      >
        현재 위치 가져오는 중...
      </div>
    </>
  );
}

export default FloatingButtons;