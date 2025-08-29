import { useState } from 'react';
import './css/Surveys.css';

function Surveys() {
    // 전체 설문 리스트 (나중엔 DB나 props에서 불러올 수 있음)
    const surveyList = [
        "스마트폰을 얼마나 자주 하시나요?",
        "하루 평균 몇 시간 정도 사용하시나요?",
        "주로 어떤 앱을 많이 사용하시나요?",
        "스마트폰을 통해 공부를 한 적이 있나요?",
        "스마트폰 중독이라고 생각하시나요?",
        "스마트폰 없이는 생활이 불편하다고 생각하시나요?",
        "스마트폰으로 여가 시간을 보내는 편인가요?",
        "스마트폰을 가족이나 친구와 주로 사용하나요?",
        "스마트폰이 수면에 영향을 준다고 생각하시나요?",
        "스마트폰 대신 다른 취미를 가진 적이 있나요?"
    ];

    // 보여줄 개수 (처음 6개)
    const [visibleCount, setVisibleCount] = useState(6);

    // 더보기 클릭 이벤트
    const handleSeeMore = () => {
        setVisibleCount((prev) => prev + 6);
    };

    return (
        <div className="surveys">
            <div className="surveyText lemon-regular">Surveys</div>
            <div className="rectList">
                {surveyList.slice(0, visibleCount).map((question, index) => (
                    <div className="rect" key={index}>
                        <p className="rectText">{question}</p>
                        <div className="graph"></div>
                        <img
                            className="part"
                            src={`${process.env.PUBLIC_URL}/img/participation.svg`}
                            alt="button"
                        />
                    </div>
                ))}
            </div>

            {visibleCount < surveyList.length && (
                <div className="seeMore" onClick={handleSeeMore}>
                    <img
                        src={`${process.env.PUBLIC_URL}/img/seeMore.svg`}
                        alt="see more"
                    />
                </div>
            )}
        </div>
    );
}

export default Surveys;
