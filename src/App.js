import React, { useState, useEffect } from "react";
import backgroundImage from "./assets/images/background.webp";
import TwitchStream from "./TwitchStream";
import { getLiveStatus } from "./utils/twitchApi";

// List of all potential streamers
const allStreamers = [
  "null__p01nt3r",
  "dadbod_55",
  "madskillzmaniac",
  "datdudefiddy4",
  "BigStaudi44",
  "travistty",
  "rolle",
  "MlC4H",
  "rutz12",
  // "картофель902",
];

function App() {
  const [liveStreams, setLiveStreams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const liveData = await getLiveStatus(allStreamers);
        setLiveStreams(liveData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch live streams:", err);
        setError("Failed to fetch live streams. Please try again later.");
      }
    };

    fetchLiveStreams();
    const intervalId = setInterval(fetchLiveStreams, 300000); // Poll every 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  if (error) {
    return <div className="text-white text-center">{error}</div>;
  }

  // Function to determine grid columns based on number of live streams
  const getGridColumns = () => {
    const count = liveStreams.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

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
