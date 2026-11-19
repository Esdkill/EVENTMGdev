"use client";

import { useState } from "react";
import type { DraftFields } from "../../../lib/request-draft-fields";
import { requestTypes } from "../../../lib/request-fields";
import { RequestFieldsForm } from "./request-fields-form";
import { Icon, RequestHeader } from "../request-ui";
import { DraftAssistant } from "./draft-assistant";

export function NewRequestForm({ submissionKey, openAssistant }: { submissionKey: string; openAssistant: boolean }) {
  const [assistant, setAssistant] = useState(openAssistant);
  const [source, setSource] = useState<{ draft: DraftFields; demo: boolean }>();
  const [type, setType] = useState<DraftFields["type"]>("enrollment");

  return <>
    <RequestHeader title="Новая заявка" subtitle={!assistant && type ? requestTypes[type] : undefined} back="/requests" />
    {!source && <div className="request-row action-row request-draft-toggle">
      <button type="button" className="secondary" aria-expanded={assistant} onClick={() => setAssistant(current => !current)}>
        <Icon name="home-file-plus" monochrome />{assistant ? "Заполнить вручную" : "Подготовить с помощником"}
      </button>
    </div>}
    {assistant && <DraftAssistant onApply={(draft, demo) => { setSource({ draft, demo }); setType(draft.type); setAssistant(false); }} />}
    <RequestFieldsForm submissionKey={submissionKey} source={source} focusNotice onTypeChange={setType} hidden={assistant} />
  </>;
}
