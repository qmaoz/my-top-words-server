const dotenv = require('dotenv');
const sequelize = require('../db');
const { DataTypes } = require('sequelize');

dotenv.config({ quiet: true });

const LearningStatus = sequelize.define('learning_statuses',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
  },
  {
    timestamps: false,
    tableName: 'learning_statuses'
  },
);

const User = sequelize.define('users',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
    tableName: 'users',
    scopes: {
      withoutPassword: {
        attributes: { exclude: ['password'] }
      }
    }
  },
);

const Word = sequelize.define('words',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    word_text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    word_translation_uk: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sentence_translation_uk: {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
  {
    timestamps: false,
    tableName: 'words'
  },
);

const WordSet = sequelize.define('word-sets',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    timestamps: false,
    tableName: 'word_sets'
  },
);

const UsersWords = sequelize.define('users__words',
  {
    last_repeat_date: {
      type: DataTypes.DATEONLY
    },
    is_saved_for_learning: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
  },
  {
    timestamps: false,
    tableName: 'users__words'
  },
);

const WordsWordSets = sequelize.define('words__word_sets',
  {
    word_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'words',
        key: 'id'
      }
    },
    word_set_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'word_sets',
        key: 'id'
      }
    },
    is_included: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    timestamps: false,
    tableName: 'words__word_sets'
  },
);

const UsersWordSets = sequelize.define('users__word_sets',
  {
    is_saved_for_learning: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    timestamps: false,
    tableName: 'users__word_sets'
  },
);



User.hasMany(Word, {
  foreignKey: 'owner_user_id'
});
Word.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'wordOwnerInfo',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});


User.belongsToMany(Word, {
  through: UsersWords,
  foreignKey: 'user_id',
  as: 'users',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Word.belongsToMany(User, {
  through: UsersWords,
  foreignKey: 'word_id',
  as: 'users',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

User.hasMany(WordSet, {
  foreignKey: 'owner_user_id'
});
WordSet.belongsTo(User, {
  foreignKey: 'owner_user_id',
  as: 'wordSetOwnerInfo',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

User.belongsToMany(WordSet, {
  through: UsersWordSets,
  foreignKey: 'user_id',
  as: 'userWordSets',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
WordSet.belongsToMany(User, {
  through: UsersWordSets,
  foreignKey: 'word_set_id',
  as: 'wordSetUsers',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Word.belongsToMany(WordSet, {
  through: WordsWordSets,
  foreignKey: 'word_id',
  as: 'wordSets',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
WordSet.belongsToMany(Word, {
  through: WordsWordSets,
  foreignKey: 'word_set_id',
  as: 'wordSetWords',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

UsersWords.belongsTo(LearningStatus, {
  foreignKey: 'word_learning_status_id',
  as: 'wordLearningStatus',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

UsersWords.belongsTo(Word, {
  foreignKey: 'word_id',
  as: 'wordProgress',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Word.hasMany(UsersWords, {
  foreignKey: 'word_id',
  as: 'wordProgress',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

LearningStatus.hasMany(UsersWords, {
  foreignKey: 'word_learning_status_id',
  as: 'wordStatuses'
});



WordSet.prototype.toJSON = function () {
  const values = { ...this.get() };
  
  if (!values?.wordSetOwnerInfo) {
    delete values.wordSetOwnerInfo;
  }
  
  if (values.is_public == null) {
    values.is_public = false;
  }

  return values;
};



module.exports = {
  LearningStatus, User, Word, WordSet, UsersWords, WordsWordSets, UsersWordSets
};