import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function App() {
  const [cars, setCars] = useState([]);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");

  // データ取得
  const fetchCars = async () => {
    const { data, error } = await supabase.from("cars").select("*");
    if (error) {
      console.error(error);
    } else {
      setCars(data);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  // 追加
  const addCar = async () => {
    if (!name || !plate) return;

    const { error } = await supabase.from("cars").insert([
      {
        id: crypto.randomUUID(),
        name,
        plate,
      },
    ]);

    if (error) {
      console.error(error);
    } else {
      setName("");
      setPlate("");
      fetchCars();
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>HANDYMAN Fleet Manager</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="車両名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="ナンバー"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
        />
        <button onClick={addCar}>追加</button>
      </div>

      <ul>
        {cars.map((car) => (
          <li key={car.id}>
            {car.name} - {car.plate}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
