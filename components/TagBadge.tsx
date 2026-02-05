import React from 'react';
import { Tag as TagIcon } from 'lucide-react';

interface TagBadgeProps {
    tags: string[];
    maxVisible?: number;
    size?: 'sm' | 'md';
}

const TagBadge: React.FC<TagBadgeProps> = ({ tags = [], maxVisible = 2, size = 'sm' }) => {
    if (!tags || tags.length === 0) return null;

    const visibleTags = tags.slice(0, maxVisible);
    const remainingCount = tags.length - maxVisible;

    const getTagColor = (tag: string) => {
        const colors = [
            'bg-blue-100 text-blue-700',
            'bg-green-100 text-green-700',
            'bg-purple-100 text-purple-700',
            'bg-pink-100 text-pink-700',
            'bg-yellow-100 text-yellow-700',
            'bg-indigo-100 text-indigo-700',
            'bg-red-100 text-red-700',
            'bg-teal-100 text-teal-700',
        ];

        const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs'
    };

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {visibleTags.map((tag, index) => (
                <span
                    key={index}
                    className={`inline-flex items-center gap-1 rounded-full font-semibold ${getTagColor(tag)} ${sizeClasses[size]}`}
                    title={tag}
                >
                    {size === 'md' && <TagIcon size={10} strokeWidth={3} />}
                    <span className="truncate max-w-[80px]">{tag}</span>
                </span>
            ))}
            {remainingCount > 0 && (
                <span
                    className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-200 text-slate-600 ${sizeClasses[size]}`}
                    title={`+${remainingCount} tags: ${tags.slice(maxVisible).join(', ')}`}
                >
                    +{remainingCount}
                </span>
            )}
        </div>
    );
};

export default TagBadge;
