import React from "react";

const TwitchStream = ({ channel }) => {
  return (
    <div className="w-full aspect-w-16 aspect-h-9">
      <iframe
        src={`https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`}
        allowFullScreen
        frameBorder="0"
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default TwitchStream;
