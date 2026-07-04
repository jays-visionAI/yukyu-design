import { useState } from 'react';
import Modal from '../../components/Modal';
import { useData } from '../../data/DataContext';
import { useToast } from '../../components/Toast';
import { fileSize } from '../../lib/format';
import type { ProgressAttachment, ProgressUpdate } from '../../data/types';

interface Props {
  open: boolean;
  onClose: () => void;
  quoteId: string;
}

type Category = 'progress' | 'evidence' | 'issue' | 'note';

interface FileItem {
  file: File;
  dataUrl: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  progress: '진행 상황',
  evidence: '증빙 자료',
  issue: '이슈 / 문의',
  note: '일반 메모',
};

export default function ProgressSubmitModal({ open, onClose, quoteId }: Props) {
  const { addProgressUpdate, getQuote } = useData();
  const toast = useToast();
  const quote = getQuote(quoteId);

  const [category, setCategory] = useState<Category>('progress');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [authorName, setAuthorName] = useState(quote?.customerName ?? '');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCategory('progress');
    setTitle('');
    setMessage('');
    setAuthorName(quote?.customerName ?? '');
    setFiles([]);
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const items: FileItem[] = [];
    for (const f of Array.from(list)) {
      // base64 변환
      const dataUrl = await readAsDataURL(f);
      items.push({ file: f, dataUrl });
    }
    setFiles((cur) => [...cur, ...items]);
  }

  function removeFile(i: number) {
    setFiles((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!authorName.trim()) {
      toast.error('작성자 이름을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const attachments: ProgressAttachment[] = files.map((f) => ({
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: f.file.name,
      size: f.file.size,
      type: f.file.type || 'application/octet-stream',
      dataUrl: f.dataUrl,
      uploadedAt: new Date().toISOString(),
    }));
    const upd: Omit<ProgressUpdate, 'id' | 'at'> = {
      authorName: authorName.trim(),
      authorRole: 'customer',
      category,
      title: title.trim(),
      message: message.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      visibleToCustomer: true,
    };
    addProgressUpdate(quoteId, upd);
    toast.success('제출이 완료되었습니다. 담당자에게 전달되었어요.');
    setSubmitting(false);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="공사 경과 / 증빙자료 제출"
      onClose={onClose}
      maxWidth={680}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? '제출 중…' : '제출하기'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field-label">유형</label>
        <div className="checkbox-grid">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <label
              key={c}
              className={`check-pill ${category === c ? 'checked' : ''}`}
            >
              <input
                type="radio"
                name="category"
                checked={category === c}
                onChange={() => setCategory(c)}
              />
              {CATEGORY_LABEL[c]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label">
          제목<span className="req">*</span>
        </label>
        <input
          className="input"
          placeholder="예: 거실 타일 시공 완료, 자재 영수증 첨부"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label">상세 설명</label>
        <textarea
          className="textarea"
          placeholder="현장 상황, 요청사항, 전달사항 등을 자유롭게 작성해주세요."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="files">
          사진 / 파일 첨부
        </label>
        <input
          id="files"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
        <div className="field-hint">
          jpg / png / pdf 등 (localStorage 용량 제한이 있어 너무 큰 파일은
          피해주세요)
        </div>
        {files.length > 0 && (
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}
          >
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 6,
                  background: '#fff',
                  position: 'relative',
                }}
              >
                {f.file.type.startsWith('image/') ? (
                  <img
                    src={f.dataUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 4,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-bg-muted)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    📄 {f.file.name.slice(0, 10)}…
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    marginTop: 4,
                  }}
                >
                  {fileSize(f.file.size)}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeFile(i)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'rgba(0,0,0,.5)',
                    color: '#fff',
                    width: 22,
                    height: 22,
                    fontSize: 12,
                  }}
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="author">
          작성자<span className="req">*</span>
        </label>
        <input
          id="author"
          className="input"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
        />
      </div>
    </Modal>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
