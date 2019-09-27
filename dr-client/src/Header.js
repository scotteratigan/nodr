import React, { useState } from "react";

const Header = props => {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const logIn = e => {
    e.preventDefault();
    // alert("Logging in with: " + account + " " + password);
    props.getLoginKey(account, password);
  };

  return !props.loggedIn ? (
    <div className="nameInput">
      <form>
        <label>
          Account Name:
          <input
            name="accountname"
            type="text"
            value={account}
            onChange={e => setAccount(e.target.value)}
          />
        </label>
        <label>
          Password:
          <input
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>
        <button onClick={logIn}>Log In</button>
      </form>
    </div>
  ) : (
    <button>Log Out</button>
  );
};

export default Header;
