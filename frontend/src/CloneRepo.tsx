import axios from "axios";
import { useState } from "react";

export default function CloneRepo()
{
  return (
    <>
      <SelectCloneRepoForm />
    </>  
  );
}

function SelectCloneRepoForm()
{
  const [target, setTarget] = useState('');

  const onSubmit = (event: React.SubmitEvent) : void =>  {
    event.preventDefault();
    
    axios.post("http://localhost:3000/agent/clone",
      { target: target, },
      { method: "POST" },
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="url"
        placeholder="URL"
        onChange={
        (event: React.ChangeEvent<HTMLInputElement>) : void => {
          console.log(`Setting value to: ${event.target.value}`);
          setTarget(event.target.value);
        }
      }
      />
    <button>Clone repo</button>
    </form>
  )
}
