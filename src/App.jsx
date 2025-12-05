// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

import MapContainer from './components/MapContainer';
import Header from './components/Header';
import FloatingButtons from './components/FloatingButtons';
import PlaceListModal from './components/modals/PlaceListModal';
import SearchModal from './components/modals/SearchModal';
import SettingsModal from './components/modals/SettingsModal';
import RecommendationModal from './components/modals/RecommendationModal'; 


// 전역 헬퍼 함수들은 여기에 모아둘게.
// 나중에는 별도의 유틸리티 파일 (src/utils/helpers.js 등)으로 분리할 수 있어.

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
      } else { // 'default' 또는 'prompt' 상태 (권한이 아직 결정되지 않음)
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
  // 💡 이 로그 확인 (App.jsx의 showNotification 함수 호출 시점)
  console.log(`🔔 showNotification 호출됨! 제목: "${title}", 내용: "${body}"`); 
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: '/logo5.svg' });
    } else if (Notification.permission === 'denied') {
      console.warn('알림 권한이 "거부됨" 상태입니다. 브라우저 설정에서 변경해야 합니다.');
    } else { // 'default' 또는 'prompt' 상태
      console.warn('알림 권한이 아직 허용되지 않았습니다. 권한을 먼저 요청합니다.');
    }
  } else {
    console.warn('⚠️ 이 브라우저는 웹 알림을 지원하지 않습니다.');
  }
}

// 💡 MapContainer에 있던 getDistance 함수를 App.jsx로 옮겨왔습니다.
/**
 * 두 지점 간의 거리를 미터 단위로 계산합니다 (하버사인 공식).
 * @param {number} lat1 - 첫 번째 지점의 위도
 * @param {number} lon1 - 첫 번째 지점의 경도
 * @param {number} lat2 - 두 번째 지점의 위도
 * @param {number} lon2 - 두 번째 지점의 경도
 * @returns {number} 두 지점 간의 거리 (미터)
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = lat1 * Math.PI / 180; // 위도를 라디안으로 변환
  const φ2 = lat2 * Math.PI / 180; // 위도를 라디안으로 변환
  const Δφ = (lat2 - lat1) * Math.PI / 180; // 위도 차이를 라디안으로 변환
  const Δλ = (lon2 - lon1) * Math.PI / 180; // 경도 차이를 라디안으로 변환

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위 거리
}

// 💡 새로운 함수: 1km 이내에 있는 장소 3개 그룹 찾기 (RecommendationModal 관련)
/**
 * userPlaces에서 서로 maxDistance 이내에 있는 장소 그룹(최소 minGroupSize 이상)을 찾습니다.
 * @param {Array<Object>} places - 사용자 장소 목록
 * @param {number} minGroupSize - 최소 그룹 크기 (기본값 3)
 * @param {number} maxDistance - 최대 거리 (미터 단위, 기본값 1000m = 1km)
 * @returns {Array<Array<Object>>} 찾은 장소 그룹들의 배열
 */
function findNearbyGroups(places, minGroupSize = 3, maxDistance = 1000) {
  const groups = [];

  // 최소 그룹 크기보다 장소가 적으면 그룹을 만들 수 없음
  if (places.length < minGroupSize) {
    return groups;
  }

  // 조합을 생성하는 재귀 함수 (깊이 우선 탐색)
  function generateCombinations(startIdx, currentCombination) {
    if (currentCombination.length === minGroupSize) {
      // minGroupSize 만큼 조합이 완성되면, 해당 조합 내의 모든 장소들이 서로 maxDistance 이내인지 확인
      let allNearby = true;
      for (let i = 0; i < minGroupSize; i++) {
        for (let j = i + 1; j < minGroupSize; j++) {
          const p1 = currentCombination[i];
          const p2 = currentCombination[j];
          // getDistance 함수를 사용
          if (getDistance(p1.lat, p1.lng, p2.lat, p2.lng) > maxDistance) {
            allNearby = false; // 하나라도 거리가 멀면 실패
            break;
          }
        }
        if (!allNearby) break;
      }

      if (allNearby) {
        groups.push(currentCombination); // 조건을 만족하는 그룹 추가
      }
      return;
    }

    if (startIdx >= places.length) {
      return;
    }

    // 현재 장소를 조합에 포함시키는 경우
    generateCombinations(startIdx + 1, [...currentCombination, places[startIdx]]);
    // 현재 장소를 조합에 포함시키지 않는 경우
    generateCombinations(startIdx + 1, currentCombination);
  }

  generateCombinations(0, []); // 0번째 인덱스부터 시작, 빈 조합

  // 중복 그룹 방지 (같은 장소들로 구성된 그룹이지만 순서만 다른 경우)
  const uniqueGroups = [];
  const uniqueGroupKeys = new Set();

  groups.forEach(group => {
    // 장소 ID로 정렬하여 고유한 키 생성
    const key = group.map(p => p.id).sort().join('-');
    if (!uniqueGroupKeys.has(key)) {
      uniqueGroups.push(group);
      uniqueGroupKeys.add(key);
    }
  });

  return uniqueGroups;
}


function App() {
  const [userPlaces, setUserPlaces] = useState(() => {
    // localStorage에서 userPlaces 초기 로딩 
    console.log('localStorage에서 userPlaces 초기 로딩 시도...');
    const storedPlaces = localStorage.getItem('언제갈지도_places');
    if (storedPlaces) {
      try {
        const parsedPlaces = JSON.parse(storedPlaces);
        // isEntered 상태는 MapContainer 내부에서만 관리되므로, 여기서는 초기화 시 추가하지 않습니다.
        parsedPlaces.forEach(place => (place.isEntered = false)); // 이전 로직 유지를 위해
        console.log('localStorage에서 userPlaces 초기 로딩 완료:', parsedPlaces);
        return parsedPlaces;
      } catch (e) {
        console.error("localStorage userPlaces 파싱 실패:", e);
      }
    }
    console.log('localStorage에 userPlaces 없음. 빈 배열로 초기화.');
    return [];
  });

  const [appSettings, setAppSettings] = useState(() => {
    const storedSettings = localStorage.getItem('언제갈지도_appSettings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
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
    return {
      defaultRadius: 1000,
      notifyOnEnter: true,
      notifyOnExit: true,
    };
  });

  // 💡 모달 열림/닫힘 상태 추가
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false); // 💡 추천 모달 상태 추가
  const [recommendedGroups, setRecommendedGroups] = useState([]); // 💡 추천 그룹 목록 상태 추가

  // 📍 Kakao Maps API 객체들을 위한 Ref들 (MapContainer로 전달)
  const mapRef = useRef(null);
  const myLocationOverlayRef = useRef(null);
  const currentRadiusCircleRef = useRef(null);
  const currentNameOverlayRef = useRef(null);
  const markerClustererRef = useRef(null);


  // ⭐️ useEffect: 컴포넌트 마운트 시 초기화 (알림 권한 요청) ⭐️
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // userPlaces가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    const placesToSave = userPlaces.map(
      // isEntered는 localStorage에 저장하지 않고, MapContainer에서 내부적으로만 관리
      ({ id, name, lat, lng, radius }) => ({ id, name, lat, lng, radius }) 
    );
    localStorage.setItem('언제갈지도_places', JSON.stringify(placesToSave));
    console.log('localStorage에 장소 저장됨 (userPlaces 변경):', userPlaces);
  }, [userPlaces]);

  // appSettings가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('언제갈지도_appSettings', JSON.stringify(appSettings));
    console.log('localStorage에 설정 저장됨 (appSettings 변경):', appSettings);
  }, [appSettings]);


  // 📍 모든 UI (모달, 메뉴)를 닫는 헬퍼 함수
  const closeAllModals = useCallback(() => {
    setIsPlaceModalOpen(false);
    setIsSearchModalOpen(false);
    setIsSettingsModalOpen(false);
    setIsRecommendationModalOpen(false); // 💡 추천 모달 닫기 추가
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
      // isEntered는 MapContainer 내부에서만 관리
    };

    setUserPlaces((prevPlaces) => [...prevPlaces, newPlace]); // 상태 업데이트
    console.log(`새 장소 등록 및 저장 완료: ${placeName}, 반경: ${radius}m`);
    return newPlace;
  }, [appSettings.defaultRadius]);

  // 📍 장소 삭제 로직 (Modal 등에서 호출됨)
  const deletePlace = useCallback((idToDelete) => {
    setUserPlaces((prevPlaces) => {
      const newPlaces = prevPlaces.filter((place) => place.id !== idToDelete);
      // 현재 지도에 표시된 오버레이가 삭제될 장소의 것이라면 지도에서 제거
      if (currentNameOverlayRef.current && currentNameOverlayRef.current._placeId === idToDelete) {
        currentNameOverlayRef.current.setMap(null);
        currentNameOverlayRef.current = null;
      }
      if (currentRadiusCircleRef.current && currentRadiusCircleRef.current._placeId === idToDelete) {
         currentRadiusCircleRef.current.setMap(null);
         currentRadiusCircleRef.current = null;
      }
      return newPlaces;
    });
  }, [currentNameOverlayRef, currentRadiusCircleRef]);


  // 💡 새로운 함수: 주변 장소 추천 시작 (FloatingButtons에서 호출될 예정)
  const startRecommendation = useCallback(() => {
    closeAllModals(); // 다른 모든 모달 닫기
    
    // findNearbyGroups 함수를 사용
    const groups = findNearbyGroups(userPlaces, 3, 1000); // 최소 3개, 1km 이내
    console.log("추천 그룹 발견:", groups);
    
    if (groups.length > 0) {
      setRecommendedGroups(groups); // 찾은 그룹들을 상태에 저장
      setIsRecommendationModalOpen(true); // 추천 모달 열기
    } else {
      alert("서로 1km 이내에 있는 3개 이상의 장소 그룹을 찾을 수 없습니다.");
    }
  }, [userPlaces, closeAllModals]);


  return (
    <div className="App">
      <Header
        openPlaceModal={() => setIsPlaceModalOpen(true)}
        openSearchModal={() => setIsSearchModalOpen(true)}
        openSettingsModal={() => setIsSettingsModalOpen(true)}
        closeAllModals={closeAllModals}
      />

      <FloatingButtons
        mapRef={mapRef}
        myLocationOverlayRef={myLocationOverlayRef}
        closeAllModals={closeAllModals}
        startRecommendation={startRecommendation} // 💡 추천 기능 시작 함수 전달
      />

      <main>
        <MapContainer
          mapRef={mapRef}
          myLocationOverlayRef={myLocationOverlayRef}
          currentRadiusCircleRef={currentRadiusCircleRef}
          currentNameOverlayRef={currentNameOverlayRef}
          markerClustererRef={markerClustererRef}
          userPlaces={userPlaces}
          appSettings={appSettings}
          addPlace={addPlace}
          showNotification={showNotification}
          closeAllModals={closeAllModals}
        />
      </main>

      <PlaceListModal
        isOpen={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        userPlaces={userPlaces}
        deletePlace={deletePlace}
        mapRef={mapRef}
        currentRadiusCircleRef={currentRadiusCircleRef}
        currentNameOverlayRef={currentNameOverlayRef}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        userPlaces={userPlaces}
        deletePlace={deletePlace}
        mapRef={mapRef}
        currentRadiusCircleRef={currentRadiusCircleRef}
        currentNameOverlayRef={currentNameOverlayRef}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appSettings={appSettings}
        setAppSettings={setAppSettings}
      />
      
      {/* 💡 새로운 모달: 추천 장소 그룹을 보여줍니다 */}
      <RecommendationModal
        isOpen={isRecommendationModalOpen}
        onClose={() => setIsRecommendationModalOpen(false)}
        recommendedGroups={recommendedGroups} // 추천 그룹 목록 전달
        mapRef={mapRef}
        currentRadiusCircleRef={currentRadiusCircleRef}
        currentNameOverlayRef={currentNameOverlayRef}
      />

      <footer>
        <p>© 2025 언제갈지도 — Created by 멍순이</p>
      </footer>
    </div>
  );
}

export default App;