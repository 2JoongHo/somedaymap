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
  const watchIdRef = useRef(null); 
  const geocoder = useRef(null);
  const ps = useRef(null);     

  const [isMapInitialized, setIsMapInitialized] = useState(false); // 지도 객체 초기화 완료 상태

  // 💡 [App.jsx에서 옮겨온 getDistance]
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

  // Props로 넘어오는 userPlaces와 appSettings의 최신 값을 참조하기 위한 Ref
  const userPlacesLatestRef = useRef(userPlaces);
  userPlacesLatestRef.current = userPlaces; 

  const appSettingsLatestRef = useRef(appSettings);
  appSettingsLatestRef.current = appSettings;

  // addPlace 함수가 변경될 때마다 최신 버전을 참조하기 위한 Ref
  const addPlaceRef = useRef(addPlace);
  useEffect(() => {
    addPlaceRef.current = addPlace; 
  }, [addPlace]);

  // 💡 [추가] 각 장소의 진입 상태를 MapContainer 내부에서만 관리하는 Ref
  // Map<placeId, isEntered> 형태로 저장하며, watchPosition 콜백에서 사용됩니다.
  const placeEntryStatusRef = useRef(new Map());

  // 장소 클릭 핸들러 (마커 클릭 또는 다른 모달에서 호출)
  const handlePlaceClick = useCallback((placeId) => {
    if (!isMapInitialized || !mapRef.current || !window.kakao || !window.kakao.maps) return; 

    const foundPlace = userPlacesLatestRef.current.find(place => place.id === placeId); // 💡 userPlacesLatestRef 사용
    if (!foundPlace) return;

    const latlng = new window.kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
    mapRef.current.setCenter(latlng);       
    mapRef.current.setLevel(3);       

    if (currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setMap(null);
      currentRadiusCircleRef.current = null;
    }
    currentRadiusCircleRef.current = new window.kakao.maps.Circle({
      map: mapRef.current,
      center: latlng,
      radius: foundPlace.radius,
      strokeWeight: 2, strokeColor: '#007BFF', strokeOpacity: 0.8,
      strokeStyle: 'solid', fillColor: '#007BFF', fillOpacity: 0.2
    });
    currentRadiusCircleRef.current._placeId = placeId; 

    if (currentNameOverlayRef.current) {
      currentNameOverlayRef.current.setMap(null);
      currentNameOverlayRef.current = null;
    }
    currentNameOverlayRef.current = new window.kakao.maps.CustomOverlay({
      map: mapRef.current,
      position: latlng,
      content: `<div class="marker-name-overlay">${foundPlace.name}</div>`,
      yAnchor: 2.2, zIndex: 3
    });
    currentNameOverlayRef.current.setMap(mapRef.current);
    currentNameOverlayRef.current._placeId = placeId; 

    console.log(`[MapContainer] '${foundPlace.name}'(으)로 지도 이동 및 반경/이름 오버레이 표시.`);
    closeAllModals();
  }, [isMapInitialized, mapRef, currentRadiusCircleRef, currentNameOverlayRef, closeAllModals]); // 💡 userPlacesLatestRef가 종속성에 필요 없음


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
        if (navigator.geolocation && mapRef.current) {
            // 이전에 설정된 watchPosition이 있다면 제거하고 다시 설정 (컴포넌트가 다시 마운트될 때 안전하게 처리)
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }

            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const currentLat = position.coords.latitude;
                    const currentLng = position.coords.longitude;
                    const userPosition = new window.kakao.maps.LatLng(currentLat, currentLng);
                    
                    console.log(`MapContainer: ✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`);

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

                    // 💡 userPlacesLatestRef.current를 순회하며 진입/이탈 상태를 placeEntryStatusRef에서 관리
                    userPlacesLatestRef.current.forEach(place => {
                        const distance = getDistance(currentLat, currentLng, place.lat, place.lng);
                        const isCurrentlyEntered = placeEntryStatusRef.current.get(place.id) || false; // 현재 감지된 상태 (없으면 false)

                        if (distance <= place.radius) { // 반경 내 진입
                            if (!isCurrentlyEntered) { // 새로 진입했다면
                                if (appSettingsLatestRef.current.notifyOnEnter) {
                                    const notificationTitle = `🚨 ${place.name}에 도착!`;
                                    const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
                                    showNotification(notificationTitle, notificationBody);
                                }
                                placeEntryStatusRef.current.set(place.id, true); // 상태 업데이트 (진입 상태로)
                                console.log(`MapContainer: 진입 감지 - ${place.name}`);
                            }
                        } else { // 반경 밖 이탈
                            if (isCurrentlyEntered) { // 이탈했다면 (이전에 진입 상태였다면)
                                if (appSettingsLatestRef.current.notifyOnExit) {
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
                    console.warn('MapContainer: ⚠️ 위치 정보를 지속적으로 가져올 수 없습니다.');
                    console.error('MapContainer: 위치 정보 오류 코드:', error.code, '메시지:', error.message);
                    if (myLocationOverlayRef.current) {
                        myLocationOverlayRef.current.setMap(null);
                        myLocationOverlayRef.current = null;
                    }
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }
        setIsMapInitialized(true);
      });
    } else {
      console.error("MapContainer: ❌ window.kakao.maps.load 함수를 찾을 수 없습니다. index.html의 Kakao Maps API 스크립트 로드를 확인하세요.");
    }

    // 컴포넌트 언마운트 시 Geolocation watchPosition 정리
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("MapContainer: Geolocation watchPosition 정리 완료.");
        watchIdRef.current = null; // 정리 후 ref도 null로 초기화
      }
    };
  // 💡 최종 의존성 배열. 모든 종속성이 명확하고 불필요한 재실행을 방지하도록 최적화했습니다.
  }, [
    mapDivRef, mapRef, isMapInitialized, closeAllModals, getDistance, 
    myLocationOverlayRef, showNotification, markerClustererRef, 
    currentRadiusCircleRef, currentNameOverlayRef, userPlacesLatestRef, appSettingsLatestRef
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
        handlePlaceClick(place.id); 
      });

      newMarkersForCluster.push(marker);
    });

    markerClustererRef.current.addMarkers(newMarkersForCluster);
    console.log(`MapContainer: ${userPlaces.length}개의 마커 업데이트 완료.`);

  }, [userPlaces, isMapInitialized, mapRef, markerClustererRef, handlePlaceClick]); // handlePlaceClick 의존성 추가

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
    </div>
  );
}

export default MapContainer;