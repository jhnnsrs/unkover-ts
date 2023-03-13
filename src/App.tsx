import { useState } from "react";
import "./App.css";
import { Callback, EasyGuard, EasyProvider, useApp } from "@jhnnsrs/arkitekt";
import { useDatalayer } from "@jhnnsrs/datalayer";
import { useMikroQuery } from "@jhnnsrs/mikro";
import { gql } from "@apollo/client";
import { TwoDKanvas } from "./unkover/components/TwoDKanvas";
import { UnkoverProvider } from "./unkover/UnkoverProvider";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

export const Image = ({ rep }: { rep: any }) => {
  const { s3resolve } = useDatalayer();

  return (
    <div className="rounded rounded-md overflow-hidden text-black flex flex-col">
      <TwoDKanvas path={s3resolve(rep.store)} shape={rep.shape} />
      <div className="p-2">{rep.name}</div>
    </div>
  );
};

export const MultiWell = () => {
  const { data } = useMikroQuery(gql`
    query {
      representations(limit: 3) {
        id
        name
        shape
        store
      }
    }
  `);

  return (
    <div className="grid grid-cols-3 gap-2 mt-1 ">
      {data?.representations?.map((r: any, index: number) => (
        <Image rep={r} key={index} />
      ))}
    </div>
  );
};

export const Test = () => {
  const { manifest } = useApp();

  return (
    <>
      <h1>
        {manifest.identifier}:{manifest.version}
      </h1>
      <div className="font-light">Lets look at your latest images</div>
      <EasyGuard>
        <MultiWell />
      </EasyGuard>
    </>
  );
};

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <EasyProvider
        manifest={{
          identifier: "github.io.jhnnsrs.arkitekt",
          version: "latest",
        }}
      >
        <UnkoverProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Test />} />
              <Route path="/callback" element={<Callback autoClose={true} />} />
            </Routes>
          </Router>
        </UnkoverProvider>
      </EasyProvider>
    </div>
  );
}

export default App;
