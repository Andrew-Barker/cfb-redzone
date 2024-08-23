import React, { useState, useEffect, useRef } from "react";
import backgroundImage from "./assets/images/background.webp";
import TwitchStream from "./TwitchStream";
import { getAuthUrl, handleRedirect, getLiveStatus, isTokenValid } from "./utils/twitchApi";

const defaultStreamers = [
  { username: "null__p01nt3r", isDefault: true, isEnabled: true },
  { username: "dadbod_55", isDefault: true, isEnabled: true },
  { username: "madskillzmaniac", isDefault: true, isEnabled: true },
  { username: "datdudefiddy", isDefault: true, isEnabled: true },
  { username: "BigStaudi", isDefault: true, isEnabled: true },
  { username: "travistty", isDefault: true, isEnabled: true },
  { username: "Rolleuserpic", isDefault: true, isEnabled: true },
  { username: "MlC4H", isDefault: true, isEnabled: true },
  { username: "rutz12", isDefault: true, isEnabled: true },
];

const loadLiveStreamsFromLocalStorage = () => {
  const data = localStorage.getItem("live_streams");
  if (data) {
    const parsedData = JSON.parse(data);
    return parsedData.sort((a, b) => a.user_login.localeCompare(b.user_login, undefined, { sensitivity: "base" }));
  }
  return [];
};

const saveLiveStreamsToLocalStorage = (streams) => {
  localStorage.setItem("live_streams", JSON.stringify(streams));
};

const loadStreamersFromLocalStorage = () => {
  const data = localStorage.getItem("streamers");
  if (data) {
    return JSON.parse(data);
  } else {
    saveStreamersToLocalStorage(defaultStreamers);
    return defaultStreamers;
  }
};

const saveStreamersToLocalStorage = (streamers) => {
  localStorage.setItem("streamers", JSON.stringify(streamers));
};

function App() {
  const [liveStreams, setLiveStreams] = useState(loadLiveStreamsFromLocalStorage());
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [streamers, setStreamers] = useState(loadStreamersFromLocalStorage());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showManageStreamersModal, setShowManageStreamersModal] = useState(false);
  const [newStreamer, setNewStreamer] = useState("");

  // Ref for the settings menu
  const settingsMenuRef = useRef(null);

  const updateLiveStreams = async () => {
    try {
      const enabledStreamers = loadStreamersFromLocalStorage()
        .filter((streamer) => streamer.isEnabled)
        .map((streamer) => streamer.username);
      const liveData = await getLiveStatus(enabledStreamers);
      const sortedLiveData = liveData.sort((a, b) => a.user_login.localeCompare(b.user_login, undefined, { sensitivity: "base" }));
      setLiveStreams(sortedLiveData);
      saveLiveStreamsToLocalStorage(sortedLiveData);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch live streams:", err);
      setError("Failed to fetch live streams. Please try again later.");
    }
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        if (window.location.hash) {
          handleRedirect();
          setIsAuthenticated(true);
          window.history.pushState({}, document.title, window.location.pathname); // Remove hash from URL
        } else if (isTokenValid()) {
          setIsAuthenticated(true);
        } else {
          window.location = getAuthUrl();
          return; // Stop execution here to prevent the loop
        }

        if (isAuthenticated) {
          await updateLiveStreams();
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
        await updateLiveStreams();
      }, 300000); // Poll every 5 minutes
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, liveStreams]);

  useEffect(() => {
    const storedStreamers = loadStreamersFromLocalStorage();
    const defaultUsernames = defaultStreamers.map((streamer) => streamer.username);

    // Remove any default streamers from local storage that are not in the default list
    const updatedStreamers = storedStreamers.filter((streamer) => {
      if (streamer.isDefault) {
        return defaultUsernames.includes(streamer.username);
      }
      return true;
    });

    // Add any new default streamers to local storage
    defaultUsernames.forEach((username) => {
      if (!updatedStreamers.some((streamer) => streamer.username === username)) {
        updatedStreamers.push({ username, isDefault: true, isEnabled: true });
      }
    });

    saveStreamersToLocalStorage(updatedStreamers);
    setStreamers(updatedStreamers);
  }, []);

  // Close settings modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target) &&
        !event.target.closest("iframe") // Check if the click is on an iframe
      ) {
        setShowSettingsModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("twitch_access_token");
    localStorage.removeItem("twitch_token_expiry");
    localStorage.removeItem("twitch_username");
    setIsAuthenticated(false);
  };

  const handleAddStreamer = async () => {
    if (newStreamer && !streamers.some((streamer) => streamer.username === newStreamer)) {
      const updatedStreamers = [...streamers, { username: newStreamer, isDefault: false, isEnabled: true }];
      setStreamers(updatedStreamers);
      saveStreamersToLocalStorage(updatedStreamers);
      await updateLiveStreams(); // Fetch live streams after adding
      setNewStreamer("");
    }
  };

  const handleRemoveStreamer = async (streamer) => {
    const updatedStreamers = streamers
      .map((item) => {
        if (item.username === streamer) {
          if (item.isDefault) {
            return { ...item, isEnabled: false }; // Disable default streamers
          } else {
            return null; // Remove non-default streamers
          }
        }
        return item;
      })
      .filter(Boolean); // Filter out null values

    setStreamers(updatedStreamers);
    saveStreamersToLocalStorage(updatedStreamers);
    await updateLiveStreams(); // Fetch live streams after disabling or removing
  };

  const handleEnableStreamer = async (streamer) => {
    const updatedStreamers = streamers.map((item) => {
      if (item.username === streamer) {
        return { ...item, isEnabled: true };
      }
      return item;
    });
    setStreamers(updatedStreamers);
    saveStreamersToLocalStorage(updatedStreamers);
    await updateLiveStreams(); // Fetch live streams after enabling
  };

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
      <div className="w-full min-h-screen bg-black bg-opacity-50 p-4 flex flex-col">
        <div className="flex justify-end items-center mb-4 fixed top-4 right-4 z-30">
          <div className="avatar cursor-pointer relative" onClick={() => setShowSettingsModal(!showSettingsModal)} ref={settingsMenuRef}>
            <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center">
              {localStorage.getItem("twitch_username")?.charAt(0).toUpperCase()}
            </div>
            {showSettingsModal && (
              <div className="absolute bg-white text-black p-4 rounded shadow-lg z-10 right-0 w-64 mt-2">
                <div className="mb-2">
                  Hello, <span className="text-purple-600 italic font-bold">{localStorage.getItem("twitch_username")}</span>
                </div>
                <ul className="list-none p-0">
                  <li className="mb-2 hover:bg-gray-100 rounded p-2 cursor-pointer" onClick={() => setShowManageStreamersModal(true)}>
                    Manage Streamers
                  </li>
                  <li className="mb-2 hover:bg-gray-100 rounded p-2 cursor-pointer text-purple-600" onClick={handleSignOut}>
                    Sign Out
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        {liveStreams.length > 0 ? (
          <div className={`w-full grid ${getGridColumns()} gap-4`}>
            {liveStreams.map((stream) => (
              <TwitchStream key={stream.id} channel={stream.user_login} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full min-h-screen h-full">
            <div className="text-white text-center text-2xl">No streams are currently live.</div>
          </div>
        )}
        {showManageStreamersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
            <div className="bg-white p-6 rounded shadow-lg max-w-screen-md min-w-96 relative">
              <button className="absolute top-2 right-2 text-gray-600 hover:text-gray-900" onClick={() => setShowManageStreamersModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-lg font-bold mb-4">Manage Streamers</h3>
              <p className="mb-2 text-sm text-gray-500">
                Streamers marked with <span className="font-bold">Added by Admin</span> can only be disabled and cannot be removed. These are the
                names of league members and are automatically tied to every user's account.
              </p>
              <ul className="list-none p-0 mb-4">
                {streamers.map((streamer, index) => (
                  <li key={index} className={`flex justify-between items-center mb-2 text-xl ${!streamer.isEnabled ? "bg-gray-200" : ""}`}>
                    <span className={`${!streamer.isEnabled ? "line-through text-gray-500" : ""}`}>
                      {streamer.username}{" "}
                      {streamer.isDefault && (
                        <span className="bg-purple-600 text-white text-[0.6rem] font-bold rounded px-2 py-0.5 ml-2">Added by Admin</span>
                      )}
                    </span>
                    {streamer.isDefault && !streamer.isEnabled ? (
                      <button
                        className="bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-sm w-24"
                        onClick={() => handleEnableStreamer(streamer.username)}
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        className={`bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded text-sm w-24`}
                        onClick={() => handleRemoveStreamer(streamer.username)}
                      >
                        {streamer.isDefault ? "Disable" : "Remove"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <input
                type="text"
                value={newStreamer}
                onChange={(e) => setNewStreamer(e.target.value)}
                placeholder="Add a streamer"
                className="border p-1 rounded w-full mb-2"
              />
              <button onClick={handleAddStreamer} className="bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded w-full">
                Add
              </button>
              <button
                className="block mt-4 bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded w-full"
                onClick={() => setShowManageStreamersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
