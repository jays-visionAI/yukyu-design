import { useState } from 'react';
import Modal from '../../components/Modal';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';
import { StarRating } from '../../components/StarRating';

interface Props {
  open: boolean;
  onClose: () => void;
  quoteId: string;
}

export default function ReviewModal({ open, onClose, quoteId }: Props) {
  const { submitReview, getQuote } = useData();
  const toast = useToast();
  const quote = getQuote(quoteId);

  const [overall, setOverall] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [quality, setQuality] = useState(0);
  const [schedule, setSchedule] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [comment, setComment] = useState('');

  function reset() {
    setOverall(0);
    setCommunication(0);
    setQuality(0);
    setSchedule(0);
    setCleanliness(0);
    setComment('');
  }

  function handleOverall(v: number) {
    setOverall(v);
    if (
      communication === 0 ||
      quality === 0 ||
      schedule === 0 ||
      cleanliness === 0
    ) {
      setCommunication(v);
      setQuality(v);
      setSchedule(v);
      setCleanliness(v);
    }
  }

  function submit() {
    if (overall === 0) {
      toast.error('전체 만족도를 선택해주세요.');
      return;
    }
    submitReview(quoteId, {
      rating: overall,
      comment: comment.trim() || undefined,
      ratings: {
        communication: communication || overall,
        quality: quality || overall,
        schedule: schedule || overall,
        cleanliness: cleanliness || overall,
        overall,
      },
    });
    toast.success('소중한 평가 감사합니다!');
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title={`만족도 평가 · ${quote?.customerName ?? ''} 님`}
      onClose={onClose}
      maxWidth={680}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            취소
          </button>
          <button className="btn btn-accent" onClick={submit}>
            평가 제출
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>
        시공이 완료되었습니다. 담당자와 시공은 어떠셨나요? 1점부터 5점까지
        평가하실 수 있어요.
      </p>

      <RatingRow
        label="전체 만족도"
        required
        value={overall}
        onChange={handleOverall}
      />
      <div className="divider" />
      <RatingRow
        label="소통"
        sub="연락 응대, 설명, 일정 공유"
        value={communication}
        onChange={setCommunication}
      />
      <RatingRow
        label="시공 품질"
        sub="자재 / 마감 / 디테일"
        value={quality}
        onChange={setQuality}
      />
      <RatingRow
        label="일정 준수"
        sub="약속 일정, 공정 진행"
        value={schedule}
        onChange={setSchedule}
      />
      <RatingRow
        label="현장 관리"
        sub="청소, 안전, 자재 정리"
        value={cleanliness}
        onChange={setCleanliness}
      />

      <div className="field">
        <label className="field-label" htmlFor="comment">
          코멘트 (선택)
        </label>
        <textarea
          id="comment"
          className="textarea"
          placeholder="좋았던 점이나 개선되었으면 하는 점을 자유롭게 작성해주세요."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function RatingRow({
  label,
  sub,
  value,
  onChange,
  required,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px dashed var(--color-border)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {sub}
          </div>
        )}
      </div>
      <StarRating value={value} onChange={onChange} size={26} />
    </div>
  );
}
