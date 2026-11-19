"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { nameInitials, type StoredName } from "../lib/person-name";
import { SignOutDialog } from "./confirm-signout";
import { AccountSettingsDialog } from "./account-settings";
import { Icon, Initials } from "./requests/request-ui";

export function CabinetAccount({ name, storedName, identity, avatar, staff, moreActive }: {
  name: string; storedName: StoredName; identity: string | null; avatar?: string; staff: boolean; moreActive: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const signout = useRef<HTMLDialogElement>(null);

  function close() {
    if (details.current) details.current.open = false;
  }

  useEffect(() => {
    function onOutsidePress(event: PointerEvent) {
      if (details.current?.open && event.target instanceof Node && !details.current.contains(event.target)) close();
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details.current?.open) return;
      close();
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", onOutsidePress);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePress);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return <><details className="cabinet-account" ref={details}>
    <summary ref={trigger} title={name} aria-label={`Меню аккаунта · ${name}`}>
      <Initials name={name} stored={storedName} src={avatar} />
      <span className="cabinet-account-text">
        <strong>
          <span>{storedName.lastName || storedName.firstName}</span>
          {storedName.lastName && <span>{nameInitials(storedName)}</span>}
        </strong>
        {identity && <small className="muted">{identity}</small>}
      </span>
      <Icon name="home-account" size={16} monochrome />
    </summary>
    <nav className="cabinet-glass cabinet-account-menu" aria-label="Действия аккаунта">
      <div className="cabinet-account-identity">{name}</div>
      <Link className="cabinet-account-choice" href="/profile" onClick={close}>
        <Icon name="user" size={18} monochrome /><span>Профиль</span>
      </Link>
      <button type="button" className="cabinet-account-choice" aria-haspopup="dialog"
        onClick={() => { close(); settings.current?.showModal(); }}>
        <Icon name="account-settings" size={18} monochrome /><span>Настройки</span>
      </button>
      <Link className="cabinet-account-choice" href="/more" aria-current={moreActive ? "page" : undefined} onClick={close}>
        <Icon name="nav-more" size={18} monochrome /><span>Ещё</span>
      </Link>
      <div className="cabinet-account-exit">
        <button className="cabinet-account-choice cabinet-account-signout" type="button" aria-haspopup="dialog"
          onClick={() => { close(); signout.current?.showModal(); }}>
          <Icon name="account-logout" size={18} monochrome /><span>Выйти</span>
        </button>
      </div>
    </nav>
  </details>
    <SignOutDialog dialog={signout} onClose={() => trigger.current?.focus()} />
    <AccountSettingsDialog dialog={settings} staff={staff} onClose={() => trigger.current?.focus()} />
  </>;
}
