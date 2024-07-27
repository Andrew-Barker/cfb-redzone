import React, { useState, useEffect } from "react";
import backgroundImage from "./assets/images/background.webp";
import TwitchStream from "./TwitchStream";
import { getAuthUrl, handleRedirect, getLiveStatus, isTokenValid } from "./utils/twitchApi";

const allStreamers = [
  "null__p01nt3r",
  "dadbod_55",
  "madskillzmaniac",
  "datdudefiddy",
  "BigStaudi",
  "travistty",
  "rolle",
  "MlC4H",
  "rutz12",
  // "картофель902", // Commented out as it might cause issues due to non-ASCII characters
];

function App() {
  const [liveStreams, setLiveStreams] = useState([]);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        if (window.location.hash) {
          console.log("Handling redirect...");
          handleRedirect();
          setIsAuthenticated(true);
          window.history.pushState({}, document.title, window.location.pathname); // Remove hash from URL
        } else if (isTokenValid()) {
          console.log("Token is valid");
          setIsAuthenticated(true);
        } else {
          console.log("Redirecting to Twitch for authentication...");
          window.location = getAuthUrl();
          return; // Stop execution here to prevent the loop
        }

        if (isAuthenticated) {
          console.log("Fetching live streams...");
          const liveData = await getLiveStatus(allStreamers);
          setLiveStreams(liveData);
          setError(null);
        }
      } catch (err) {
        console.error("Authentication error:", err);
        setError("Authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndFetch();
  }, [isAuthenticated]);

  useEffect(() => {
    let intervalId;
    if (isAuthenticated) {
      intervalId = setInterval(async () => {
        try {
          const liveData = await getLiveStatus(allStreamers);
          setLiveStreams(liveData);
        } catch (err) {
          console.error("Failed to fetch live streams:", err);
        }
      }, 10000); // Poll every 10 seconds (10000 milliseconds)
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const getGridColumns = () => {
    const count = liveStreams.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  if (isLoading) {
    return <div className="text-white text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-white text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed flex items-center" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="w-full min-h-screen bg-black bg-opacity-50 p-4 flex items-center">
        {liveStreams.length > 0 ? (
          <div className={`w-full grid ${getGridColumns()} gap-4`}>
            {liveStreams.map((stream) => (
              <TwitchStream key={stream.id} channel={stream.user_login} />
            ))}
          </div>
        ) : (
          <div className="w-full text-white text-center text-2xl">No streams are currently live.</div>
        )}
      </div>
    </div>
  );
}

export default App;
