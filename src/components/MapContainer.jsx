// src/components/MapContainer.jsx
import React, { useEffect, useRef, useCallback } from 'react';

// 전역 window.kakao 객체를 사용 (public/index.html에서 로드됨)
const { kakao } = window;

function MapContainer({
  mapRef, // App.jsx에서 생성된 map 인스턴스를 저장할 ref
  myLocationOverlayRef, // 내 위치 오버레이 ref
  currentRadiusCircleRef, // 현재 지도에 표시된 반경 원 ref
  currentNameOverlayRef, // 마커 클릭 시 이름 오버레이 ref
  markerClustererRef, // 마커 클러스터러 ref
  userPlaces, // 앱의 모든 장소 데이터 (App.jsx로부터 props로 받음)
  appSettings, // 앱 설정 데이터 (App.jsx로부터 props로 받음)
  addPlace, // 장소 추가 함수 (App.jsx로부터 props로 받음)
  showNotification, // 알림 표시 함수 (App.jsx로부터 props로 받음)
  closeAllModals, // 모든 모달을 닫는 함수 (App.jsx로부터 props로 받음)
}) {
  // 지도가 그려질 DOM 요소를 참조
  const mapDivRef = useRef(null);
  // Geolocation watchPosition의 ID를 저장 (cleanup에 사용)
  const watchIdRef = useRef(null);

  // Kakao Maps 서비스 객체 (컴포넌트 내에서 한 번만 생성)
  const geocoder = useRef(null);
  const ps = useRef(null);

  // 헬퍼 함수: 두 지점 간 거리 계산 (바닐라 JS와 동일)
  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // 지구의 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // ⭐️ 1. 지도 초기화 및 Geolocation watchPosition 설정 (컴포넌트 마운트 시 1회) ⭐️
  useEffect(() => {
    // Kakao Maps API 로드 확인
    if (!kakao || !kakao.maps) {
      console.error("Kakao Maps API가 로드되지 않았습니다.");
      return;
    }

    if (!mapDivRef.current) return; // 지도 컨테이너 DOM 요소 없으면 리턴

    // 지도가 아직 생성되지 않았을 때만 초기화
    if (!mapRef.current) {
      const defaultCenter = new kakao.maps.LatLng(37.245833, 127.056667); // 망포역
      mapRef.current = new kakao.maps.Map(mapDivRef.current, {
        center: defaultCenter,
        level: 3,
      });

      // MarkerClusterer 초기화
      markerClustererRef.current = new kakao.maps.MarkerClusterer({
        map: mapRef.current,
        averageCenter: true,
        minLevel: 6, // 클러스터 할 최소 지도 레벨 (확대 단계)
        disableClickZoom: false,
      });
      console.log("카카오맵 초기화 완료 및 MarkerClusterer 준비!");

      // 서비스 객체 초기화
      geocoder.current = new kakao.maps.services.Geocoder();
      ps.current = new kakao.maps.services.Places();

      // ⭐️ 페이지 로드 시 사용자의 현재 위치로 지도 중심 재설정 ⭐️
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const userPosition = new kakao.maps.LatLng(lat, lng);
            mapRef.current.setCenter(userPosition);
            console.log("지도 중심을 현재 위치로 초기 설정했습니다:", lat, lng);
          },
          (error) => {
            console.warn("최초 위치 가져오기 실패. 기본 중심(망포역)을 사용합니다.", error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }

      // ⭐️ 지도 이벤트 리스너 설정 ⭐️
      // 좌클릭: 모든 UI 닫기 (이전 코드에서 closeAllModals는 여기서 호출되지 않았었음. 이제 명확하게 호출)
      kakao.maps.event.addListener(mapRef.current, 'click', () => {
        closeAllModals(); // App.jsx의 closeAllModals 호출
        // 지도 클릭 시 현재 열려있던 이름 오버레이/반경 원도 닫기
        if (currentNameOverlayRef.current) {
            currentNameOverlayRef.current.setMap(null);
            currentNameOverlayRef.current = null;
        }
        if (currentRadiusCircleRef.current) {
            currentRadiusCircleRef.current.setMap(null);
            currentRadiusCircleRef.current = null;
        }
      });

      // 우클릭: 장소 추가
      kakao.maps.event.addListener(mapRef.current, 'rightclick', (mouseEvent) => {
        const latlng = mouseEvent.latLng;
        let defaultName = "새로운 장소";

        ps.current.keywordSearch('', (data, status) => {
          if (status === kakao.maps.services.Status.OK && data.length > 0) {
            defaultName = data[0].place_name;
            const genericKeywords = ['빌딩', '도로', '아파트', '주택', '건물', '입구', '정류장', '교차로', '지점', '타워'];
            if (genericKeywords.some(keyword => defaultName.includes(keyword)) || data[0].category_group_code === '') {
              defaultName = "새로운 장소";
            }
          }

          if (defaultName === "새로운 장소") {
            geocoder.current.coord2Address(latlng.getLng(), latlng.getLat(), (result, status) => {
              if (status === kakao.maps.services.Status.OK) {
                defaultName = result[0].road_address?.address_name || result[0].address?.address_name || "새로운 장소";
              }
              addPlace(latlng, defaultName); // App.jsx의 addPlace 함수 호출
            });
          } else {
            addPlace(latlng, defaultName); // App.jsx의 addPlace 함수 호출
          }
        }, {
          location: latlng,
          radius: 50,
          size: 1
        });
      });
    }

    // ⭐️ Geolocation watchPosition 설정 (지오펜싱) ⭐️
    // 컴포넌트 마운트 시 한 번 실행 후 userPlaces나 appSettings 변경 시에는 계속 지오펜싱 로직만 반복
    if (navigator.geolocation && mapRef.current) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;
            const userPosition = new kakao.maps.LatLng(currentLat, currentLng);
            
            console.log(`✅ 현재 위치: ${currentLat}, ${currentLng} (정확도: ${position.coords.accuracy}m)`);

            // 내 위치 CustomOverlay 업데이트 또는 생성
            if (myLocationOverlayRef.current) {
              myLocationOverlayRef.current.setPosition(userPosition);
            } else {
              myLocationOverlayRef.current = new kakao.maps.CustomOverlay({
                map: mapRef.current,
                position: userPosition,
                content: '<div class="my-location-dot"></div>',
                zIndex: 100,
              });
            }

            // ⭐️ Geofencing 로직 ⭐️
            userPlaces.forEach(place => {
              const distance = getDistance(currentLat, currentLng, place.lat, place.lng);

              if (distance <= place.radius) {
                if (!place.isEntered) { // 처음 진입
                  if (appSettings.notifyOnEnter) {
                    const notificationTitle = `🚨 ${place.name}에 도착!`;
                    const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m 내에 진입했습니다! 현재 ${distance.toFixed(1)}m`;
                    console.log(notificationBody);
                    showNotification(notificationTitle, notificationBody);
                  }
                  place.isEntered = true; // App.jsx의 userPlaces를 직접 수정하면 리렌더링X.
                                          // setUserPlaces를 통해 새로운 배열로 업데이트해야 리렌더링됨.
                                          // 이 로직은 geofencing의 내부 상태이므로, 필요시 App.jsx의 userPlaces 상태에
                                          // isEntered를 업데이트하는 로직을 추가해야 함. (현재는 콜백 내부 상태만 변경)
                }
              } else {
                if (place.isEntered) { // 처음 이탈
                  if (appSettings.notifyOnExit) {
                    const notificationTitle = `ℹ️ ${place.name} 이탈`;
                    const notificationBody = `설정하신 ${place.name} 반경 ${place.radius}m를 벗어났습니다. 현재 ${distance.toFixed(1)}m`;
                    console.log(notificationBody);
                    showNotification(notificationTitle, notificationBody);
                  }
                  place.isEntered = false; // 위와 동일
                }
              }
            });

          },
          (error) => {
            console.warn('⚠️ 위치 정보를 지속적으로 가져올 수 없습니다.');
            console.error('위치 정보 오류 코드:', error.code, '메시지:', error.message);
            if (myLocationOverlayRef.current) {
              myLocationOverlayRef.current.setMap(null);
              myLocationOverlayRef.current = null;
            }
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }


    // ⭐️ Cleanup 함수 ⭐️
    return () => {
      // 컴포넌트 언마운트 시 watchPosition 정리
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("Geolocation watchPosition 정리 완료.");
      }
      // 카카오맵 이벤트 리스너 정리 (선택 사항, map 인스턴스가 사라지면 자동으로 정리되는 경우가 많음)
      // Map 인스턴스를 useRef에 저장하고 App.jsx에서 관리하면, 명시적인 정리 코드가 필요할 수도 있음
    };
  }, [addPlace, showNotification, closeAllModals, getDistance, mapRef, markerClustererRef, myLocationOverlayRef, appSettings, userPlaces]); // ✨✨ 의존성 배열 수정: `handlePlaceClick` 제거, 관련된 prop 추가 ✨✨

  // ⭐️ 2. userPlaces 변경 시 마커 및 클러스터 다시 그리기 ⭐️
  // 이 useEffect는 `handlePlaceClick`의 최신 버전을 참조해야 함.
  useEffect(() => {
    if (!mapRef.current || !markerClustererRef.current) return;

    markerClustererRef.current.clear(); // 기존 클러스터 초기화
    const newMarkersForCluster = []; // 새로 추가할 마커들을 담을 배열

    userPlaces.forEach(place => {
      const latlng = new kakao.maps.LatLng(place.lat, place.lng);
      const marker = new kakao.maps.Marker({ position: latlng });

      // ⭐️ 마커 클릭 이벤트 리스너 추가 ⭐️
      kakao.maps.event.addListener(marker, 'click', () => {
        // useCallback으로 감싼 handlePlaceClick 함수를 직접 호출한다.
        handlePlaceClick(place.id); 
      });

      newMarkersForCluster.push(marker);
    });

    markerClustererRef.current.addMarkers(newMarkersForCluster); // 클러스터러에 마커 추가
    console.log(`[MapContainer] ${userPlaces.length}개의 마커 업데이트 완료.`);

  }, [userPlaces, mapRef, markerClustererRef, handlePlaceClick]); // ✨✨ 의존성 배열 수정: `handlePlaceClick`은 이제 안정적인 참조 ✨✨

  // ⭐️ 3. '내 위치로 이동' 기능 (컴포넌트 바깥에서도 호출 가능하도록 useCallback 사용) ⭐️
  const moveToCurrentLocation = useCallback(() => {
    // App.jsx에서 전달받은 closeAllModals() 함수 호출 (다른 UI 닫기)
    closeAllModals();

    if (navigator.geolocation) {
      console.log('moveToCurrentLocation: Geolocation API 호출 시작.');
      // 임시 로딩 메시지 UI (App.jsx에서 관리하거나 전역 UI 라이브러리 사용 가능)
      // 여기서는 직접 로딩 메시지를 DOM에 추가하지 않고 console.log로 대체

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ getCurrentPosition 성공 콜백 실행!');
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const userPosition = new kakao.maps.LatLng(lat, lng);
          
          if (mapRef.current) {
            mapRef.current.setCenter(userPosition); // 지도를 현재 위치로 이동
            mapRef.current.setLevel(3);           // 확대 레벨 조정
            console.log('지도 현재 위치로 이동 완료:', lat, lng);

            // 내 위치 CustomOverlay 업데이트
            if (myLocationOverlayRef.current) {
              myLocationOverlayRef.current.setPosition(userPosition);
            } else {
              myLocationOverlayRef.current = new kakao.maps.CustomOverlay({
                map: mapRef.current,
                position: userPosition,
                content: '<div class="my-location-dot"></div>',
                zIndex: 100,
              });
            }
          }
        },
        (error) => {
          console.log('❌ getCurrentPosition 실패 콜백 실행!', error);
          let errorMessage = "내 위치를 가져올 수 없습니다. 브라우저/기기 위치 설정 및 권한을 확인해주세요.";
          switch (error.code) {
            case error.PERMISSION_DENIED: errorMessage = "사용자가 위치 정보 접근을 허용하지 않았습니다. 브라우저 상단의 팝업 또는 기기 설정을 확인해주세요."; break;
            case error.POSITION_UNAVAILABLE: errorMessage = "위치 정보를 사용할 수 없습니다. (GPS 신호 불량, Wi-Fi 불안정 등)"; break;
            case error.TIMEOUT: errorMessage = "위치 정보를 가져오는 요청이 시간 초과되었습니다."; break;
            default: console.error('❌ 위치 정보 오류: 알 수 없는 오류', error); break;
          }
          alert(errorMessage);
          console.error('내 위치로 이동 실패:', error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      alert("이 브라우저는 Geolocation을 지원하지 않습니다.");
      console.warn('⚠️ 이 브라우저는 Geolocation을 지원하지 않습니다.');
    }
  }, [mapRef, myLocationOverlayRef, closeAllModals]);


  // ⭐️ 4. 장소 클릭 처리 함수 (지도 이동, 반경, 이름 오버레이 표시) ⭐️
  // useCallback을 사용하여 이 함수가 리렌더링 시 불필요하게 재생성되지 않도록 함
  // App.jsx에서 넘겨준 Ref들을 참조하기 때문에 의존성 배열에 포함시켜야 함.
  const handlePlaceClick = useCallback((placeId) => {
    // console.log(`[handlePlaceClick] placeId: ${placeId}`); // 디버깅용
    const foundPlace = userPlaces.find(place => place.id === placeId);
    if (!foundPlace || !mapRef.current) return;

    const latlng = new kakao.maps.LatLng(foundPlace.lat, foundPlace.lng);
    mapRef.current.setCenter(latlng); // 지도를 해당 장소의 위치로 이동
    mapRef.current.setLevel(3); // 확대 레벨을 3으로 설정

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
    // 반경 원에 placeId 저장 (App.jsx에서 삭제 시 참조용)
    currentRadiusCircleRef.current._placeId = placeId;


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
    // 이름 오버레이에 placeId 저장 (App.jsx에서 삭제 시 참조용)
    currentNameOverlayRef.current._placeId = placeId;


    console.log(`[MapContainer] '${foundPlace.name}'(으)로 지도 이동 및 반경/이름 오버레이 표시.`);
    closeAllModals(); // ✨✨ 추가: 장소를 클릭하면 다른 UI 요소를 모두 닫는다. ✨✨
  }, [userPlaces, mapRef, currentRadiusCircleRef, currentNameOverlayRef, closeAllModals]); // ✨✨ 의존성 배열 수정 ✨✨

  // ⭐️ App.jsx의 FloatingButtons 컴포넌트에서 이 함수를 호출할 수 있도록 외부로 노출 (useImperativeHandle 대신 직접 전달) ⭐️
  // MapContainer는 props로 handlePlaceClick과 moveToCurrentLocation 함수를 App.jsx에 전달하지 않으므로,
  // FloatingButtons에서 사용할 수 있도록 App.jsx가 MapContainer로부터 함수를 받거나,
  // FloatingButtons 컴포넌트 자체에서 mapRef를 통해 setCenter를 호출해야 함.
  // 여기서는 편의를 위해 `props`로 전달된 `mapRef`를 FloatingButtons에서 직접 사용하는 방식으로 접근

  // MapContainer의 특정 함수를 App.jsx로 전달하기 위해 (예: MapContainerRef 사용)
  // useImperativeHandle(ref, () => ({
  //   handlePlaceClick: handlePlaceClick,
  //   moveToCurrentLocation: moveToCurrentLocation,
  // }));
  // 그러나 App.jsx에서 ref를 넘겨받는 대신, FloatingButtons에 직접 mapRef 등을 전달하는 것이 더 React 스럽다.

  return (
    <div
      id="map" // 바닐라 JS의 #map ID를 그대로 사용 (CSS 호환성)
      ref={mapDivRef} // React에서 DOM 요소를 참조하는 방식
      style={{ width: '100%', height: '100vh', minHeight: '300px', position: 'relative', zIndex: 1 }}
    >
      {/* 맵이 로드될 영역 */}
    </div>
  );
}

export default MapContainer;