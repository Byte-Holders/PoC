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
    
    // faccio richiesta nel corpo del messaggio a seconda di come
    // ho scritto il metodo nel controller agent che è,
    // al momento della scrittura del commento
    // @Post('clone') -> endpoint /agent/clone (agent da @Controller('agent'))
    // cloneRepo(@Body('target') url: string) { -> descrizione dell'input atteso
    //   this.AgentService.cloneRepo(url);
    // }
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
          console.log(`Aggiornamento stato url: ${event.target.value}`);
          setTarget(event.target.value);
        }
      }
      />
    <button>Clone repo</button>
    </form>
  )
}
