// src/components/MapContainer.jsx
import React, { useEffect, useRef, useCallback, useState } from 'react';

function MapContainer({
  mapRef, 
  myLocationOverlayRef, 
  currentRadiusCircleRef, 
  currentNameOverlayRef, 
  markerClustererRef, 
  userPlaces, 
  appSettings, 
  addPlace, 
  showNotification, 
  closeAllModals, 
}) {
  const mapDivRef = useRef(null); 
  const watchIdRef = useRef(null); // Geolocation watch ID 저장
  const geocoder = useRef(null); // Kakao Geocoder 인스턴스
  const ps = useRef(null);     // Kakao PlacesService 인스턴스

  const [isMapInitialized, setIsMapInitialized] = useState(false); // 지도 객체 초기화 완료 상태
  // 💡 [추가] Geolocation 추적 상태를 사용자에게 보여주기 위한 state
  const [isGeolocationTracking, setIsGeolocationTracking] = useState(false);
  const [geolocationError, setGeolocationError] = useState(null); // Geolocation 오류 메시지 저장


  // 💡 App.jsx에서 옮겨온 getDistance 함수 (MapContainer 내부에서 useCallback으로 관리)
  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
  }, []);

  // Props로 넘어오는 userPlaces와 appSettings의 최신 값을 참조하기 위한 Ref (클로저 문제 방지)
  const userPlacesLatestRef = useRef(userPlaces);
  userPlacesLatestRef.current = userPlaces; 

  const appSettingsLatestRef = useRef(appSettings);
  appSettingsLatestRef.current = appSettings;

  // addPlace 함수가 변경될 때마다 최신 버전을 참조하기 위한 Ref (클로저 문제 방지)
  const addPlaceRef = useRef(addPlace);
  useEffect(() => {
    addPlaceRef.current = addPlace; 
  }, [addPlace]);

  // 💡 각 장소의 진입 상태를 MapContainer 내부에서만 관리하는 Ref
  // Map<placeId, isEntered> 형태로 저장하며, watchPosition 콜백에서 사용됩니다.
  const placeEntryStatusRef = useRef(new Map());

  // 장소 클릭 핸들러 (마커 클릭 또는 다른 모달에서 호출)
  const handlePlaceClick = useCallback((placeId) => {
    if (!isMapInitialized || !mapRef.current || !window.kakao || !window.kakao.maps) return; 

    // userPlacesLatestRef.current를 사용해 userPlaces prop의 최신 값을 참조
    const foundPlace = userPlacesLatestRef.current.find(place => place.id === placeId); 
    if (!foundPlace) return;

    const latlng = new window.kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
    mapRef.current.setCenter(latlng);       
    mapRef.current.setLevel(3);       

    // 기존 반경 원 제거
    if (currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setMap(null);
      currentRadiusCircleRef.current = null;
    }
    // 새 반경 원 생성 및 지도에 표시
    currentRadiusCircleRef.current = new window.kakao.maps.Circle({
      map: mapRef.current,
      center: latlng,
      radius: foundPlace.radius,
      strokeWeight: 2, strokeColor: '#007BFF', strokeOpacity: 0.8,
      strokeStyle: 'solid', fillColor: '#007BFF', fillOpacity: 0.2
    });
    currentRadiusCircleRef.current._placeId = placeId; // ID 저장 (삭제 로직 등에서 활용)

    // 기존 이름 오버레이 제거
    if (currentNameOverlayRef.current) {
      currentNameOverlayRef.current.setMap(null);
      currentNameOverlayRef.current = null;
    }
    // 새 이름 오버레이 생성
    currentNameOverlayRef.current = new window.kakao.maps.CustomOverlay({
      map: mapRef.current,
      position: latlng,
      content: `<div class="marker-name-overlay">${foundPlace.name}</div>`,
      yAnchor: 2.2, zIndex: 3
    });
    currentNameOverlayRef.current.setMap(mapRef.current);
    currentNameOverlayRef.current._placeId = placeId; // ID 저장

    console.log(`[MapContainer] '${foundPlace.name}'(으)로 지도 이동 및 반경/이름 오버레이 표시.`);
    closeAllModals();
  }, [isMapInitialized, mapRef, currentRadiusCircleRef, currentNameOverlayRef, closeAllModals]);


  // ⭐️ Kakao Maps API 로드 후 지도 초기화 및 모든 이벤트 리스너 설정 ⭐️
  useEffect(() => {
    if (isMapInitialized) {
      console.log("MapContainer: 지도가 이미 초기화 완료된 상태입니다. 건너뜀.");
      return;
    }
    if (!mapDivRef.current) { 
        console.warn("MapContainer: 지도를 그릴 DOM 엘리먼트(mapDivRef.current)가 아직 준비되지 않았습니다. 대기 중...");
        return;
    }

    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
      window.kakao.maps.load(function() {
        console.log("MapContainer: ✅ window.kakao.maps.load() 콜백 실행! 지도 초기화 시작!");

        const defaultCenter = new window.kakao.maps.LatLng(37.245833, 127.056667); 
        mapRef.current = new window.kakao.maps.Map(mapDivRef.current, {
            center: defaultCenter,
            level: 3,
        });

        markerClustererRef.current = new window.kakao.maps.MarkerClusterer({
            map: mapRef.current,
            averageCenter: true,
            minLevel: 6,
            disableClickZoom: false,
        });
        console.log("MapContainer: ✅ 카카오맵 초기화 완료 및 MarkerClusterer 준비!");

        geocoder.current = new window.kakao.maps.services.Geocoder();
        ps.current = new window.kakao.maps.services.Places();         

        // ⭐️ 페이지 로드 시 사용자의 현재 위치로 지도 중심 재설정 ⭐️
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const userPosition = new window.kakao.maps.LatLng(lat, lng);
                    if (mapRef.current) { 
                        mapRef.current.setCenter(userPosition);
                    }
                    console.log("MapContainer: ✅ 지도 중심을 현재 위치로 초기 설정했습니다:", lat, lng);
                },
                (error) => {
                    console.warn("MapContainer: ⚠️ 최초 위치 가져오기 실패. 기본 중심(망포역)을 사용합니다.", error);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }

        // ⭐️ 지도 이벤트 리스너 설정 ⭐️
        window.kakao.maps.event.addListener(mapRef.current, 'click', () => {
            closeAllModals();
            if (currentNameOverlayRef.current) {
                currentNameOverlayRef.current.setMap(null);
                currentNameOverlayRef.current = null;
            }
            if (currentRadiusCircleRef.current) {
                currentRadiusCircleRef.current.setMap(null);
                currentRadiusCircleRef.current = null;
            }
        });

        // ⭐️ 지도 오른쪽 클릭 시 장소 추가 이벤트 리스너 설정 ⭐️
        window.kakao.maps.event.addListener(mapRef.current, 'rightclick', (mouseEvent) => {
            const latlng = mouseEvent.latLng;
            let defaultName = "새로운 장소";

            ps.current.keywordSearch('', (data, status) => {
                if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
                    defaultName = data[0].place_name;
                    const genericKeywords = ['빌딩', '도로', '아파트', '주택', '건물', '입구', '정류장', '교차로', '지점', '타워'];
                    if (genericKeywords.some(keyword => defaultName.includes(keyword)) || data[0].category_group_code === '') {
                        defaultName = "새로운 장소";
                    }
                }

                if (defaultName === "새로운 장소") {
                    geocoder.current.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
                        if (status === window.kakao.maps.services.Status.OK) {
                            defaultName = result[0].road_address?.address_name || result[0].address?.address_name || "새로운 장소";
                        }
                        // addPlaceRef.current를 사용해 App.jsx의 addPlace 함수 최신 버전 호출
                        addPlaceRef.current(latlng, defaultName); 
                    });
                } else {
                    addPlaceRef.current(latlng, defaultName); 
                }
            }, {
                location: latlng,
                radius: 50,
                size: 1
            });
        });

        // ⭐️ Geolocation watchPosition 설정 (지오펜싱) ⭐️
        // (navigator.geolocation && mapRef.current) 조건을 한 번 더 확인하여 안전하게 실행
        if (navigator.geolocation && mapRef.current) {
            // 이전에 설정된 watchPosition이 있다면 제거하고 다시 설정 (컴포넌트가 다시 마운트될 때 안전하게 처리)
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("MapContainer: 이전 Geolocation watchPosition 정리 완료.");
            }

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const currentLat = position.coords.latitude;
                    const currentLng = position.coords.longitude;
                    const userPosition = new window.kakao.maps.LatLng(currentLat, currentLng);
                    
                    // 💡1 이 로그가 계속 찍히는지 확인
                    console.log(`MapContainer: ✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`); 
                    
                    // 💡 Geolocation 추적 성공 시 상태 업데이트 및 에러 메시지 초기화
                    setIsGeolocationTracking(true);
                    setGeolocationError(null); 

                    // 내 위치 오버레이 표시
                    if (myLocationOverlayRef.current) {
                        myLocationOverlayRef.current.setPosition(userPosition);
                    } else {
                        myLocationOverlayRef.current = new window.kakao.maps.CustomOverlay({
                            map: mapRef.current,
                            position: userPosition,
                            content: '<div class="my-location-dot"></div>',
                            zIndex: 100,
                        });
                    }

                    // userPlacesLatestRef.current를 순회하며 진입/이탈 상태를 placeEntryStatusRef에서 관리
                    userPlacesLatestRef.current.forEach(place => {
                        const distance = getDistance(currentLat, currentLng, place.lat, place.lng);
                        const isCurrentlyEntered = placeEntryStatusRef.current.get(place.id) || false; // 현재 감지된 상태 (없으면 false)

                        // 💡2 이 로그 확인
                        console.log(`MapContainer: 장소 ${place.name}까지 거리: ${distance.toFixed(1)}m, 반경: ${place.radius}m, 현재 진입상태: ${isCurrentlyEntered}`);
                        
                        if (distance <= place.radius) { // 반경 내 진입
                            if (!isCurrentlyEntered) { // 새로 진입했다면
                                // 💡3 이 로그가 찍히는지 확인
                                console.log(`MapContainer: --- ${place.name} 진입 조건 충족! ---`);
                                if (appSettingsLatestRef.current.notifyOnEnter) {
                                    // 💡4 이 로그가 찍히는지 확인
                                    console.log(`MapContainer: --- ${place.name} 진입 알림 시도! ---`);
                                    const notificationTitle = `🚨 ${place.name}에 도착!`;
                                    const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
                                    showNotification(notificationTitle, notificationBody);
                                }
                                placeEntryStatusRef.current.set(place.id, true); // 상태 업데이트 (진입 상태로)
                                console.log(`MapContainer: 진입 감지 - ${place.name}`);
                            }
                        } else { // 반경 밖 이탈
                            if (isCurrentlyEntered) { // 이탈했다면 (이전에 진입 상태였다면)
                                // 💡5 이 로그가 찍히는지 확인
                                console.log(`MapContainer: --- ${place.name} 이탈 조건 충족! ---`);
                                if (appSettingsLatestRef.current.notifyOnExit) {
                                    // 💡6 이 로그가 찍히는지 확인
                                    console.log(`MapContainer: --- ${place.name} 이탈 알림 시도! ---`);
                                    const notificationTitle = `ℹ️ ${place.name} 이탈`;
                                    const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m를 벗어났습니다. 현재 ${distance.toFixed(1)}m`;
                                    showNotification(notificationTitle, notificationBody);
                                }
                                placeEntryStatusRef.current.set(place.id, false); // 상태 업데이트 (이탈 상태로)
                                console.log(`MapContainer: 이탈 감지 - ${place.name}`);
                            }
                        }
                    });
                },
                (error) => {
                    // 💡7 에러 로그 확인
                    console.error('MapContainer: ⚠️ 위치 정보를 지속적으로 가져올 수 없습니다. 오류 코드:', error.code, '메시지:', error.message);
                    // 💡 Geolocation 에러 발생 시 상태 업데이트 및 사용자 알림
                    setIsGeolocationTracking(false);
                    setGeolocationError(`위치 추적 실패: ${error.message} (코드: ${error.code})`);
                    // 알림 권한 체크 로직 추가
                    if ('Notification' in window && Notification.permission !== 'denied') {
                        alert(`위치 추적 중 오류 발생: ${error.message}. 정확한 알림을 받기 어려울 수 있습니다.`); // 사용자에게 직접 알림
                    }
                    
                    if (myLocationOverlayRef.current) {
                        myLocationOverlayRef.current.setMap(null);
                        myLocationOverlayRef.current = null;
                    }
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // timeout 값을 늘려볼 수도 있음
            );
        } else {
             // 💡 Geolocation을 지원하지 않거나 조건 불만족 시 로그
             console.warn("MapContainer: Geolocation을 지원하지 않거나 mapRef가 준비되지 않아 위치 추적을 시작할 수 없습니다.");
             setGeolocationError("이 브라우저에서 위치 추적을 시작할 수 없습니다.");
        }
        setIsMapInitialized(true); // 지도 초기화 완료 상태 업데이트
      }); // window.kakao.maps.load() 콜백 끝
    } else {
      console.error("MapContainer: ❌ window.kakao.maps.load 함수를 찾을 수 없습니다. index.html의 Kakao Maps API 스크립트 로드를 확인하세요.");
    }

    // 컴포넌트 언마운트 시 Geolocation watchPosition 정리
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("MapContainer: Geolocation watchPosition 정리 완료.");
        watchIdRef.current = null; // 정리 후 ref도 null로 초기화
        setIsGeolocationTracking(false); // 추적 종료 상태
      }
    };
  // 💡 최종 의존성 배열: 모든 종속성이 명확하고 불필요한 재실행을 방지하도록 최적화했습니다.
  }, [
    mapDivRef, mapRef, isMapInitialized, closeAllModals, getDistance, 
    myLocationOverlayRef, showNotification, markerClustererRef, 
    currentRadiusCircleRef, currentNameOverlayRef
    // userPlacesLatestRef와 appSettingsLatestRef는 ref.current로 접근하므로 이 useEffect의 deps에는 넣지 않습니다.
    // addPlaceRef도 ref.current로 접근하므로 deps에 넣지 않습니다.
  ]);


  // ⭐️ userPlaces 변경 시 마커 및 클러스터 다시 그리기 ⭐️
  useEffect(() => {
    console.log("MapContainer: 마커 업데이트 useEffect 시작.", { isMapInitialized, mapRefCurrent: mapRef.current, userPlacesCount: userPlaces.length });
    if (!isMapInitialized || !mapRef.current || !markerClustererRef.current) {
        console.warn("MapContainer: 마커 업데이트 조건 불만족. 재시도 예정.");
        return; 
    }
    console.log("MapContainer: ✅ 마커 업데이트 실행!");

    markerClustererRef.current.clear();
    const newMarkersForCluster = [];

    userPlaces.forEach(place => {
      const latlng = new window.kakao.maps.LatLng(place.lat, place.lng);
      const marker = new window.kakao.maps.Marker({ position: latlng });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        handlePlaceClick(place.id); // 장소 클릭 핸들러 호출
      });

      newMarkersForCluster.push(marker);
    });

    markerClustererRef.current.addMarkers(newMarkersForCluster);
    console.log(`MapContainer: ${userPlaces.length}개의 마커 업데이트 완료.`);

  }, [userPlaces, isMapInitialized, mapRef, markerClustererRef, handlePlaceClick]); 

  return (
    <div
      id="map" 
      ref={mapDivRef}
      style={{ width: '100%', height: '100vh', minHeight: '300px', position: 'relative', zIndex: 1 }}
    >
      {!isMapInitialized && ( 
          <div style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)', display: 'flex', 
              justifyContent: 'center', alignItems: 'center', zIndex: 999 
          }}>
              <p>지도를 불러오는 중...</p>
          </div>
      )}
      
      💡 [추가] Geolocation 상태 표시 UI
      <div style={{
          position: 'fixed', bottom: '80px', left: '10px', 
          backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', 
          padding: '5px 10px', borderRadius: '5px', zIndex: 1000 
      }}>
          {/* {isGeolocationTracking ? '🟢 위치 추적 중' : '🔴 위치 추적 비활성'} */}
          {geolocationError && <div style={{ color: 'yellow', marginTop: '5px' }}>{geolocationError}</div>}
      </div>
    </div>
  );
}

export default MapContainer;