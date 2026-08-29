import { useNavigate } from "react-router-dom";
import { ListChecks, Scale, Layers } from "../components/icons";

const STEP_ICONS = [ListChecks, Scale, Layers];

const STEPS = [
  {
    title: "상황을 읽는다",
    body: "일상, 일과 학업, 관계, 공동활동, 변화, 선택의 순간처럼 누구나 겪는 장면이 한 번에 하나씩 주어집니다."
  },
  {
    title: "자연스러운 선택을 표시한다",
    body: "두 가지 반응 중 최근의 실제 나와 가장 가까운 쪽을 5단계로 표시합니다. 두 선택 모두 좋은 방식입니다."
  },
  {
    title: "12에너지 프로파일을 확인한다",
    body: "여섯 쌍의 에너지 균형과 나의 고유한 조합, 그리고 강점을 더 잘 쓰기 위한 안내를 확인합니다."
  }
];

export default function How() {
  const navigate = useNavigate();
  return (
    <main className="page-enter shell static-page">
      <h1>마이코어12는 이렇게 진행됩니다</h1>
      <p className="lede">
        최근의 실제 나와 가장 가까운 선택을 골라주세요. 약 7~10분이 걸리며,
        중간에 나가더라도 같은 브라우저에서 이어서 진행할 수 있습니다.
      </p>

      <div className="steps">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[i];
          return (
          <div className="step" key={s.title}>
            <span className="idx">
              <Icon />
              STEP {String(i + 1).padStart(2, "0")}
            </span>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </div>
          );
        })}
      </div>

      <div style={{ marginTop: 40 }}>
        <button className="btn btn-primary" onClick={() => navigate("/assessment")}>
          검사시작
        </button>
      </div>

      <div className="prose" style={{ marginTop: 46 }}>
        <p>
          마이코어12(MYCORE12)는 여섯 개의 양극 축에서 12가지 에너지를 <strong>상대적으로</strong>{" "}
          얼마나 자연스럽게 사용하는지를 살펴봅니다. 각 축의 두 에너지는 모두
          긍정적인 강점이며, 점수의 합은 언제나 100입니다. 결과는 능력의 총량이나
          사람 사이의 순서를 뜻하지 않습니다.
        </p>
      </div>
    </main>
  );
}

export function Privacy() {
  return (
    <main className="page-enter shell static-page">
      <h1>개인정보 · 로컬저장 안내</h1>
      <div className="prose">
        <p>
          마이코어12는 회원가입 없이 사용할 수 있습니다. 검사 진행 상태와 결과는
          서버로 전송되지 않고 지금 사용 중인 브라우저의 로컬 저장소에만
          보관됩니다.
        </p>
        <p>
          저장되는 항목은 진행 중인 검사 세션, 최근에 출제된 문항 번호, 완료된
          결과 기록입니다. 응답 내용이 공유 주소에 담기지 않습니다.
        </p>
        <p>
          화면 아래의 <strong>내 결과 삭제</strong>를 누르면 이 기기에 저장된
          모든 마이코어12 데이터가 즉시 삭제됩니다. 다른 기기나 브라우저에는 기록이
          공유되지 않습니다.
        </p>
      </div>
    </main>
  );
}
