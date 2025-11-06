import React, { useEffect, useState } from 'react';


const API_URL = 'http://localhost:5000/api/heatmap';

const HeatMap = () => {
    const [map, setMap] = useState(null);

    useEffect(() => {
        const fetchMap = async () => {
          const response = await fetch(API_URL);
          if(response.ok) {
            const map = await response.text();
            setMap(map);
          }
        };
        fetchMap();
    }, []);

    return <div dangerouslySetInnerHTML={{ __html: map }} />;
};

export default HeatMap;