// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css'; // 기존 index.css 내용을 App.css로 옮겼다고 가정

import MapContainer from './components/MapContainer';
import Header from './components/Header';
import FloatingButtons from './components/FloatingButtons';
import PlaceListModal from './components/modals/PlaceListModal';
import SearchModal from './components/modals/SearchModal';
import SettingsModal from './components/modals/SettingsModal';

// 전역 헬퍼 함수들은 여기에 모아둘게.
// 나중에는 별도의 유틸리티 파일 (src/utils/helpers.js 등)로 분리할 수 있어.

/**
 * 고유 ID를 생성합니다.
 * @returns {string} 고유 ID 문자열
 */
function generateUniqueId() {
  return 'place_' + Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * 웹 알림 권한을 요청합니다.
 */
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('🔔 알림 권한이 허용되었습니다.');
      } else if (permission === 'denied') {
        console.warn('🔕 알림 권한이 영구적으로 거부되었습니다. 알림을 받을 수 없습니다.');
      } else {
        console.warn('🔕 알림 권한이 아직 허용되지 않았습니다.');
      }
    });
  } else {
    console.warn('⚠️ 이 브라우저는 웹 알림을 지원하지 않습니다.');
  }
}

/**
 * 웹 알림 팝업을 띄웁니다.
 * @param {string} title - 알림 제목
 * @param {string} body - 알림 내용
 */
function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    // React 환경에서는 public 폴더의 에셋을 참조할 때는 절대 경로 '/'를 사용한다.
    // 또는 import해서 사용하는 방법도 있음. 지금은 public에 logo5.svg가 있다고 가정.
    new Notification(title, { body: body, icon: '/logo5.svg' }); // public 폴더에 있다고 가정
  } else if (Notification.permission !== 'denied') {
    console.warn('알림 권한이 없어서 알림을 보낼 수 없습니다. 권한을 먼저 요청합니다.');
  }
}


function App() {
  // 📍 앱의 핵심 상태 관리
  // 💡 userPlaces 초기값 로딩 방식을 appSettings와 동일하게 개선
  const [userPlaces, setUserPlaces] = useState(() => {
    console.log('localStorage에서 userPlaces 초기 로딩 시도...');
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      try {
        const parsedPlaces = JSON.parse(storedPlaces);
        // isEntered 플래그는 매 세션 시작 시 초기화
        parsedPlaces.forEach(place => (place.isEntered = false));
        console.log('localStorage에서 userPlaces 초기 로딩 완료:', parsedPlaces);
        return parsedPlaces;
      } catch (e) {
        console.error("localStorage userPlaces 파싱 실패:", e);
      }
    }
    console.log('localStorage에 userPlaces 없음. 빈 배열로 초기화.');
    return []; // localStorage에 없으면 빈 배열로 초기화
  });


  const [appSettings, setAppSettings] = useState(() => {
    // localStorage에서 설정 불러오기 (초기값 설정)
    const storedSettings = localStorage.getItem('언제갈지도_appSettings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        // 새로운 설정이 추가되어도 오류 없이 불러오도록 기본값과 병합
        return {
          defaultRadius: 1000,
          notifyOnEnter: true,
          notifyOnExit: true,
          ...parsedSettings
        };
      } catch (e) {
        console.error("localStorage 설정 파싱 실패:", e);
      }
    }
    // 기본값
    return {
      defaultRadius: 1000,
      notifyOnEnter: true,
      notifyOnExit: true,
    };
  });

  // 📍 모달 열림/닫힘 상태 관리
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 📍 Kakao Maps API 객체들을 위한 Ref들 (MapContainer로 전달, MapContainer에서 값 할당)
  // App.jsx에서 MapContainer의 특정 함수를 호출하거나 상태를 동기화해야 할 때 사용
  const mapRef = useRef(null); // MapContainer에서 생성된 지도 인스턴스
  const myLocationOverlayRef = useRef(null); // 내 위치 오버레이 ref
  const currentRadiusCircleRef = useRef(null); // 현재 표시된 반경 원 ref
  const currentNameOverlayRef = useRef(null); // 마커 클릭 시 이름 오버레이 ref
  const markerClustererRef = useRef(null); // 마커 클러스터러 ref


  // ⭐️ useEffect: 컴포넌트 마운트 시 초기화 및 localStorage 동기화 ⭐️
  useEffect(() => {
    // 페이지 로드 시 localStorage에서 장소 목록 불러오기
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      try {
        const parsedPlaces = JSON.parse(storedPlaces);
        // isEntered 플래그는 매 세션 시작 시 초기화
        parsedPlaces.forEach(place => (place.isEntered = false));
        setUserPlaces(parsedPlaces);
        console.log('localStorage에서 불러온 장소:', parsedPlaces);
      } catch (e) {
        console.error("localStorage 장소 파싱 실패:", e);
      }
    }

    // 페이지 로드 시 알림 권한 요청 (최초 1회)
    requestNotificationPermission();
  }, []); // 컴포넌트 마운트 시 1회만 실행

  // userPlaces가 변경될 때마다 localStorage에 저장 (useCallback으로 감싸지 않아도 됨)
  useEffect(() => {
    // 💡 이제 userPlaces는 useState 초기화에서 로드되므로, 이 useEffect에서는 알림 권한만 요청합니다.
    requestNotificationPermission();
  }, []); // 컴포넌트 마운트 시 1회만 실행

  // userPlaces가 변경될 때마다 localStorage에 저장 (이 로직은 그대로 유지, 잘 되어 있음)
  useEffect(() => {
    // isEntered 플래그는 세션별로 초기화되므로 localStorage에는 저장하지 않음
    const placesToSave = userPlaces.map(
      ({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius })
    );
    localStorage.setItem('언제갈지도_places', JSON.stringify(placesToSave));
    console.log('localStorage에 장소 저장됨 (userPlaces 변경):', userPlaces);
  }, [userPlaces]);

  // appSettings가 변경될 때마다 localStorage에 저장 (이 로직도 그대로 유지, 잘 되어 있음)
  useEffect(() => {
    localStorage.setItem('언제갈지도_appSettings', JSON.stringify(appSettings));
    console.log('localStorage에 설정 저장됨 (appSettings 변경):', appSettings);
  }, [appSettings]);


  // 📍 모든 UI (모달, 메뉴)를 닫는 헬퍼 함수
  const closeAllModals = useCallback(() => {
    setIsPlaceModalOpen(false);
    setIsSearchModalOpen(false);
    setIsSettingsModalOpen(false);
    // 지도에 있는 CustomOverlay나 반경 원을 닫는 로직
    // App.jsx는 UI 닫기 기능만 수행하고, 지도 관련 객체 제거는 MapContainer에 위임.
    // MapContainer의 useEffect에서 지도 클릭 이벤트 시 이 함수를 호출할 때,
    // MapContainer 내부에서 currentNameOverlayRef.current 등 제거 로직을 직접 수행해야 함.
    // 하지만 각 모달에서 onOpen/onClose 시 오버레이를 지우고 MapContainer가 UserPlaces 변경시 맵을 리렌더링하므로
    // 이 부분은 MapContainer에서 관리하도록 놔둔다.
  }, []);

  // 📍 장소 추가 로직 (MapContainer에서 호출됨)
  const addPlace = useCallback((latlng, initialName) => {
    const placeName = prompt('이 장소의 이름을 입력하세요:', initialName);
    if (!placeName || placeName.trim() === '') return;

    let radius = parseInt(
      prompt(
        `알림 반경을 미터 단위로 입력하세요 (기본값: ${appSettings.defaultRadius}m):`,
        appSettings.defaultRadius.toString()
      ),
      10 // 10진수로 파싱
    );
    if (isNaN(radius) || radius <= 0) {
      radius = appSettings.defaultRadius;
    }

    const newPlace = {
      id: generateUniqueId(),
      name: placeName,
      lat: latlng.getLat(),
      lng: latlng.getLng(),
      radius: radius,
      isEntered: false,
    };

    setUserPlaces((prevPlaces) => [...prevPlaces, newPlace]); // 상태 업데이트
    console.log(`새 장소 등록 및 저장 완료: ${placeName}, 반경: ${radius}m`);
    return newPlace; // 추가된 장소 반환 (MapContainer에서 필요할 수 있음)
  }, [appSettings.defaultRadius]); // defaultRadius 변경 시 함수 재생성

  // 📍 장소 삭제 로직 (Modal 등에서 호출됨)
  const deletePlace = useCallback((idToDelete) => {
    setUserPlaces((prevPlaces) => {
      const newPlaces = prevPlaces.filter((place) => place.id !== idToDelete);
      // 만약 현재 지도에 표시된 CustomOverlay나 Circle이 삭제된 장소였다면 제거 로직 필요
      if (currentNameOverlayRef.current && currentNameOverlayRef.current._placeId === idToDelete) { // _placeId는 CustomOverlay에 내부적으로 설정했다고 가정
        currentNameOverlayRef.current.setMap(null);
        currentNameOverlayRef.current = null;
      }
      if (currentRadiusCircleRef.current && currentRadiusCircleRef.current._placeId === idToDelete) { // _placeId는 CustomOverlay에 내부적으로 설정했다고 가정
         currentRadiusCircleRef.current.setMap(null);
         currentRadiusCircleRef.current = null;
      }
      return newPlaces;
    });
    // 마커, 클러스터 등 지도 업데이트는 userPlaces 변경에 따라 MapContainer의 useEffect에서 처리됨
  }, [currentNameOverlayRef, currentRadiusCircleRef]);


  return (
    <div className="App">
      {/* ⭐️ 1. Header 컴포넌트 렌더링 ⭐️ */}
      <Header
        openPlaceModal={() => setIsPlaceModalOpen(true)}
        openSearchModal={() => setIsSearchModalOpen(true)}
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        closeAllModals={closeAllModals}
      />

      {/* ⭐️ 2. FloatingButtons 컴포넌트 렌더링 ⭐️ */}
      <FloatingButtons
        mapRef={mapRef}
        myLocationOverlayRef={myLocationOverlayRef}
        closeAllModals={closeAllModals}
      />

      <main>
        {/* ⭐️ 3. MapContainer 컴포넌트 렌더링 ⭐️ */}
        <MapContainer
          mapRef={mapRef} // MapContainer에서 생성된 지도 인스턴스를 App에서 참조할 수 있도록
          myLocationOverlayRef={myLocationOverlayRef}
          currentRadiusCircleRef={currentRadiusCircleRef}
          currentNameOverlayRef={currentNameOverlayRef}
          markerClustererRef={markerClustererRef}
          userPlaces={userPlaces} // 장소 목록 전달
          appSettings={appSettings} // 설정값 전달
          addPlace={addPlace} // 장소 추가 함수 전달
          showNotification={showNotification} // 알림 함수 전달
          closeAllModals={closeAllModals} // 지도 클릭 시 모달 닫기용
          // 이곳에서 mapCenterRef는 MapContainer 내부에서만 관리 (map.setCenter)되므로 props로 넘기지 않음
        />
      </main>

      {/* ⭐️ 4. PlaceListModal 컴포넌트 렌더링 ⭐️ */}
      <PlaceListModal
        isOpen={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)} // 모달 닫기 함수 전달
        userPlaces={userPlaces}
        deletePlace={deletePlace} // 장소 삭제 함수 전달
        mapRef={mapRef}
        currentRadiusCircleRef={currentRadiusCircleRef}
        currentNameOverlayRef={currentNameOverlayRef}
      />

      {/* ⭐️ 5. SearchModal 컴포넌트 렌더링 ⭐️ */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)} // 모달 닫기 함수 전달
        userPlaces={userPlaces}
        deletePlace={deletePlace} // 장소 삭제 함수 전달
        mapRef={mapRef}
        currentRadiusCircleRef={currentRadiusCircleRef}
        currentNameOverlayRef={currentNameOverlayRef}
      />

      {/* ⭐️ 6. SettingsModal 컴포넌트 렌더링 ⭐️ */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)} // 모달 닫기 함수 전달
        appSettings={appSettings} // 설정 객체 전달
        setAppSettings={setAppSettings} // 설정 업데이트 함수 전달
      />

      {/* ⭐️ 7. Footer 렌더링 ⭐️ */}
      <footer>
        <p>© 2025 언제갈지도 — Created by 멍순이</p>
      </footer>
    </div>
  );
}

export default App;